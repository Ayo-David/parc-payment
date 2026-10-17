import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { z } from "zod";
import { withTenantTransaction } from "../database/client.js";
import type { ExternalTransferService } from "./external-transfer-service.js";
import type { HttpLedgerPostingGateway } from "./ledger-gateway.js";
import {
  ProviderRejectedError,
  type PaymentProvider,
  type TransferDirectoryProvider,
} from "./payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

/** Ledger purpose of the tenant's income account for customer transfer fees. */
export const TRANSFER_FEE_REVENUE_PURPOSE = "TRANSFER_FEE_REVENUE";

/**
 * Fee and limit applied to every customer bank transfer. A flat platform-wide
 * policy for now; per-tenant configuration will come from Tenant Admin.
 */
export interface BankTransferPolicy {
  flatFeeMinor: string;
  maxAmountMinor: string;
}

const enquiryTtlMs = 15 * 60_000;
const quoteTtlMs = 5 * 60_000;

interface EnquiryRow {
  id: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  provider_code: string;
  recipient_code: string;
  request_hash: string;
  expires_at: Date;
}

interface QuoteRow {
  id: string;
  enquiry_id: string;
  amount: string;
  fee_amount: string;
  total_debit: string;
  currency: string;
  narration: string;
  request_hash: string;
  expires_at: Date;
}

/**
 * The customer bank transfer flow: verify the destination account (which
 * also registers the provider's transfer recipient), quote the fee and limit,
 * then submit against that quote. The server owns the fee and the verified
 * account name; the client only echoes what it was quoted.
 */
export class BankTransferService {
  private readonly tenantAccounts = new Map<string, Promise<string>>();

  public constructor(
    private readonly db: Knex,
    private readonly routing: Pick<ProviderRoutingService, "select">,
    private readonly transfers: Pick<ExternalTransferService, "initiate">,
    private readonly ledger: Pick<
      HttpLedgerPostingGateway,
      "provisionTenantAccount"
    >,
    private readonly policy: BankTransferPolicy,
  ) {}

  public async enquire(input: {
    tenantId: string;
    customerId: string;
    bankCode: string;
    accountNumber: string;
    idempotencyKey: string;
    correlationId: string;
  }) {
    const requestHash = hash({
      customerId: input.customerId,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
    });
    const existing = await withTenantTransaction(
      this.db,
      input.tenantId,
      (tx) =>
        tx("payment_transfer_name_enquiries")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<EnquiryRow>(),
    );
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new Error("IDEMPOTENCY_KEY_REUSED");
      return enquiryResult(existing, true);
    }
    const routed = await this.routing.select({
      tenantId: input.tenantId,
      capability: "INTERBANK_TRANSFER",
      currency: "NGN",
      correlationId: input.correlationId,
      idempotencyKey: `transfer-enquiry:${input.idempotencyKey}:route`,
    });
    if (!isDirectory(routed.provider))
      throw new Error("Transfer name enquiry is unavailable for this provider");
    let resolved: { accountName: string; recipientCode?: string };
    try {
      resolved = await routed.provider.nameEnquiry({
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
      });
    } catch (error) {
      if (error instanceof ProviderRejectedError)
        throw new Error("ACCOUNT_RESOLUTION_FAILED", { cause: error });
      throw error;
    }
    if (!resolved.recipientCode)
      throw new Error("Transfer recipient is unavailable from the provider");
    const row: EnquiryRow = {
      id: randomUUID(),
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      account_name: resolved.accountName.slice(0, 200),
      provider_code: routed.provider.code,
      recipient_code: resolved.recipientCode,
      request_hash: requestHash,
      expires_at: new Date(Date.now() + enquiryTtlMs),
    };
    await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("payment_transfer_name_enquiries").insert({
        ...row,
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        routing_decision_id: routed.decisionId,
        idempotency_key: input.idempotencyKey,
      }),
    );
    return enquiryResult(row, false);
  }

  public async quote(input: {
    tenantId: string;
    customerId: string;
    enquiryToken: string;
    amountMinor: string;
    currency: string;
    narration?: string;
    idempotencyKey: string;
  }) {
    if (input.currency !== "NGN")
      throw new Error("Currency is not operationally enabled");
    const requestHash = hash({
      customerId: input.customerId,
      enquiryToken: input.enquiryToken,
      amountMinor: input.amountMinor,
      currency: input.currency,
      narration: input.narration ?? null,
    });
    return withTenantTransaction(this.db, input.tenantId, async (tx) => {
      const existing = await tx("payment_transfer_quotes")
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        })
        .first<QuoteRow>();
      if (existing) {
        if (existing.request_hash !== requestHash)
          throw new Error("IDEMPOTENCY_KEY_REUSED");
        const enquiry = await this.enquiry(
          tx,
          input.tenantId,
          input.customerId,
          existing.enquiry_id,
        );
        return quoteResult(existing, enquiry!, true);
      }
      const enquiry = await this.enquiry(
        tx,
        input.tenantId,
        input.customerId,
        input.enquiryToken,
      );
      if (!enquiry) throw new Error("TRANSFER_ENQUIRY_NOT_FOUND");
      if (new Date(enquiry.expires_at).getTime() <= Date.now())
        throw new Error("TRANSFER_ENQUIRY_EXPIRED");
      if (BigInt(input.amountMinor) > BigInt(this.policy.maxAmountMinor))
        throw new Error("TRANSFER_LIMIT_EXCEEDED");
      const fee = BigInt(this.policy.flatFeeMinor);
      const row: QuoteRow = {
        id: randomUUID(),
        enquiry_id: enquiry.id,
        amount: input.amountMinor,
        fee_amount: fee.toString(),
        total_debit: (BigInt(input.amountMinor) + fee).toString(),
        currency: input.currency,
        narration: (
          input.narration ?? `Transfer to ${enquiry.account_name}`
        ).slice(0, 100),
        request_hash: requestHash,
        expires_at: new Date(Date.now() + quoteTtlMs),
      };
      await tx("payment_transfer_quotes").insert({
        ...row,
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        idempotency_key: input.idempotencyKey,
      });
      return quoteResult(row, enquiry, false);
    });
  }

  public async submit(input: {
    tenantId: string;
    customerId: string;
    quoteId: string;
    sourceAccountId: string;
    bankCode: string;
    accountNumber: string;
    amountMinor: string;
    currency: string;
    narration: string;
    idempotencyKey: string;
    correlationId: string;
  }) {
    const { quote, enquiry, replay } = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const quote = await tx("payment_transfer_quotes")
          .where({
            tenant_id: input.tenantId,
            customer_id: input.customerId,
            id: input.quoteId,
          })
          .first<QuoteRow>();
        if (!quote) throw new Error("TRANSFER_QUOTE_NOT_FOUND");
        const enquiry = (await this.enquiry(
          tx,
          input.tenantId,
          input.customerId,
          quote.enquiry_id,
        ))!;
        const replay = await tx("payment_external_transfers")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first("id");
        return { quote, enquiry, replay: Boolean(replay) };
      },
    );
    // A replay returns the original transfer even after its quote expired.
    if (!replay && new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("TRANSFER_QUOTE_EXPIRED");
    if (
      String(quote.amount) !== input.amountMinor ||
      quote.currency.trim() !== input.currency ||
      enquiry.bank_code !== input.bankCode ||
      enquiry.account_number !== input.accountNumber
    )
      throw new Error("TRANSFER_QUOTE_MISMATCH");
    const fee = String(quote.fee_amount);
    const [settlement, feeAccount] = await Promise.all([
      this.tenantAccount(
        input.tenantId,
        `${enquiry.provider_code}_SETTLEMENT`,
        "ASSET",
      ),
      BigInt(fee) > 0n
        ? this.tenantAccount(
            input.tenantId,
            TRANSFER_FEE_REVENUE_PURPOSE,
            "INCOME",
          )
        : undefined,
    ]);
    const result = await this.transfers.initiate({
      tenantId: input.tenantId,
      customerId: input.customerId,
      sourceAccountId: input.sourceAccountId,
      settlementLedgerAccountId: settlement,
      beneficiaryName: enquiry.account_name,
      destinationAccountNumber: enquiry.account_number,
      destinationBankCode: enquiry.bank_code,
      amountMinor: String(quote.amount),
      currency: input.currency,
      narration: input.narration,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      requiredProvider: enquiry.provider_code,
      providerData: {
        recipientCode: enquiry.recipient_code,
        narration: input.narration,
      },
      quoteId: quote.id,
      feeMinor: fee,
      ...(feeAccount ? { feeLedgerAccountId: feeAccount } : {}),
    });
    return {
      id: result.id,
      status: result.status,
      amount_minor: String(quote.amount),
      fee_minor: fee,
      total_debit_minor: String(quote.total_debit),
      currency: input.currency,
      provider: enquiry.provider_code,
      replayed: result.replayed,
    };
  }

  private enquiry(
    tx: Knex.Transaction,
    tenantId: string,
    customerId: string,
    id: string,
  ): Promise<EnquiryRow | undefined> {
    if (!z.string().uuid().safeParse(id).success)
      return Promise.resolve(undefined);
    return tx("payment_transfer_name_enquiries")
      .where({ tenant_id: tenantId, customer_id: customerId, id })
      .first<EnquiryRow>();
  }

  private tenantAccount(
    tenantId: string,
    purpose: string,
    accountType: "ASSET" | "INCOME",
  ): Promise<string> {
    const key = `${tenantId}:${purpose}`;
    let account = this.tenantAccounts.get(key);
    if (!account) {
      account = this.ledger.provisionTenantAccount({
        tenantId,
        purpose,
        accountType,
      });
      // A failed lookup must not be cached: the next transfer retries it.
      account.catch(() => this.tenantAccounts.delete(key));
      this.tenantAccounts.set(key, account);
    }
    return account;
  }
}

function isDirectory(
  provider: PaymentProvider,
): provider is TransferDirectoryProvider {
  return "nameEnquiry" in provider;
}

/** The enquiry id is the token: it only resolves for the customer who made it. */
function enquiryResult(row: EnquiryRow, replayed: boolean) {
  return {
    enquiry_token: row.id,
    account_name: row.account_name,
    account_number: row.account_number,
    bank_code: row.bank_code,
    expires_at: new Date(row.expires_at).toISOString(),
    replayed,
  };
}

function quoteResult(row: QuoteRow, enquiry: EnquiryRow, replayed: boolean) {
  return {
    quote_id: row.id,
    account_name: enquiry.account_name,
    account_number: enquiry.account_number,
    bank_code: enquiry.bank_code,
    amount_minor: String(row.amount),
    fee_minor: String(row.fee_amount),
    total_debit_minor: String(row.total_debit),
    currency: row.currency.trim(),
    narration: row.narration,
    expires_at: new Date(row.expires_at).toISOString(),
    replayed,
  };
}

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
