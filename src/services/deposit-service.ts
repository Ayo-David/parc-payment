import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { z } from "zod";
import type { CollectionService } from "./collection-service.js";

/** Ledger purpose of the tenant's asset account for funds Paystack holds for it. */
export const PAYSTACK_SETTLEMENT_PURPOSE = "PAYSTACK_SETTLEMENT";
/** Ledger purpose of the tenant's expense account for Paystack's deposit fees. */
export const PAYSTACK_FEES_PURPOSE = "PAYSTACK_FEES";

const chargePayload = z
  .object({
    status: z.string(),
    reference: z.string().min(1),
    amount: z.union([z.number(), z.string()]),
    currency: z.string().default("NGN"),
    channel: z.string().optional(),
    paid_at: z.string().nullable().optional(),
    authorization: z
      .object({
        channel: z.string().optional(),
        receiver_bank_account_number: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    metadata: z
      .object({ receiver_account_number: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

/** True for a charge.success paid into one of our dedicated accounts. */
export function isDedicatedAccountDeposit(
  event: string,
  data: unknown,
): boolean {
  if (event !== "charge.success" || typeof data !== "object" || data === null)
    return false;
  const record = data as {
    channel?: unknown;
    authorization?: { channel?: unknown };
  };
  return (
    record.channel === "dedicated_nuban" ||
    record.authorization?.channel === "dedicated_nuban"
  );
}

export interface ChargeVerifier {
  verifyCharge(reference: string): Promise<{
    status: string;
    amountMinor: string;
    feesMinor: string;
    currency: string;
  }>;
}

export interface SettlementAccounts {
  provisionTenantAccount(input: {
    tenantId: string;
    purpose: string;
    accountType: "ASSET" | "EXPENSE";
  }): Promise<string>;
  post(input: {
    tenantId: string;
    idempotencyKey: string;
    reference: string;
    currency: string;
    debitAccountId: string;
    creditAccountId: string;
    amountMinor: string;
  }): Promise<{ transactionId: string; replayed: boolean }>;
}

/**
 * Credits a customer's Ledger wallet for money paid into their Paystack
 * dedicated account: debit the tenant's Paystack settlement asset, credit the
 * customer's wallet liability. The amount comes from Paystack's verify API,
 * not the webhook body, and CollectionService makes the posting idempotent
 * per Paystack reference, so redelivered webhooks never double-credit.
 *
 * The customer is credited the full amount; the tenant bears Paystack's fee,
 * booked as a second posting (debit the tenant's Paystack fee expense,
 * credit settlement) so the settlement balance matches what Paystack pays out.
 */
export class DepositService {
  private readonly tenantAccounts = new Map<string, Promise<string>>();

  public constructor(
    private readonly db: Knex,
    private readonly paystack: ChargeVerifier,
    private readonly ledger: SettlementAccounts,
    private readonly collections: Pick<CollectionService, "confirm">,
  ) {}

  /** Returns false when the account number isn't one of ours (nothing to credit). */
  public async applyCharge(input: {
    data: unknown;
    webhookId: string;
    payloadHash: string;
  }): Promise<boolean> {
    const charge = chargePayload.parse(input.data);
    if (charge.status !== "success") return false;
    const accountNumber =
      charge.authorization?.receiver_bank_account_number ??
      charge.metadata?.receiver_account_number;
    if (!accountNumber) throw new Error("Deposit carried no receiving account");
    const resolved = await this.db.raw<{
      rows: {
        tenant_id: string;
        financial_account_id: string;
        ledger_account_id: string;
      }[];
    }>("SELECT * FROM public.resolve_collection_account(?, ?)", [
      "PAYSTACK",
      accountNumber,
    ]);
    const account = resolved.rows[0];
    if (!account) return false;

    const verified = await this.paystack.verifyCharge(charge.reference);
    if (verified.status !== "success")
      throw new Error("Paystack has not confirmed this charge");
    if (
      verified.amountMinor !== String(charge.amount) ||
      verified.currency !== charge.currency
    )
      throw new Error("Paystack charge does not match the webhook");
    if (!/^[1-9][0-9]*$/.test(verified.amountMinor))
      throw new Error("Deposit amount must be positive");

    const settlement = await this.tenantAccount(
      account.tenant_id,
      PAYSTACK_SETTLEMENT_PURPOSE,
      "ASSET",
    );
    await this.collections.confirm({
      tenantId: account.tenant_id,
      providerCode: "PAYSTACK",
      providerReference: charge.reference,
      providerAccountNumber: accountNumber,
      amountMinor: verified.amountMinor,
      currency: verified.currency,
      payloadHash: input.payloadHash,
      webhookId: input.webhookId,
      ...(charge.paid_at ? { providerPaidAt: charge.paid_at } : {}),
      debitLedgerAccountId: settlement,
      creditLedgerAccountId: account.ledger_account_id,
      correlationId: randomUUID(),
    });
    if (!/^[0-9]+$/.test(verified.feesMinor))
      throw new Error("Paystack fee must be whole minor units");
    // Runs again on a redelivered webhook if it failed before; Ledger replays
    // the same idempotency key instead of booking the fee twice.
    if (verified.feesMinor !== "0")
      await this.ledger.post({
        tenantId: account.tenant_id,
        idempotencyKey: `collection-fee:PAYSTACK:${charge.reference}`,
        reference: `${charge.reference}-FEE`,
        currency: verified.currency,
        debitAccountId: await this.tenantAccount(
          account.tenant_id,
          PAYSTACK_FEES_PURPOSE,
          "EXPENSE",
        ),
        creditAccountId: settlement,
        amountMinor: verified.feesMinor,
      });
    return true;
  }

  /** The tenant's ledger account for `purpose`, provisioned on first use. */
  private tenantAccount(
    tenantId: string,
    purpose: string,
    accountType: "ASSET" | "EXPENSE",
  ): Promise<string> {
    const key = `${tenantId}:${purpose}`;
    let account = this.tenantAccounts.get(key);
    if (!account) {
      account = this.ledger.provisionTenantAccount({
        tenantId,
        purpose,
        accountType,
      });
      // Don't cache a failure; the next deposit retries provisioning.
      account.catch(() => this.tenantAccounts.delete(key));
      this.tenantAccounts.set(key, account);
    }
    return account;
  }
}
