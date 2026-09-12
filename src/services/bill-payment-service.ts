import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { BillLedgerGateway } from "./ledger-gateway.js";
import type { BillPaymentProviderRegistry } from "./bill-payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

type QuoteRow = {
  id: string;
  product_id: string;
  validation_id: string | null;
  amount: string;
  fee_amount: string;
  tax_amount: string;
  cashback_amount: string;
  total_debit: string;
  currency: string;
  provider_code: string;
  routing_decision_id: string;
  catalogue_version: number;
  expires_at: Date;
  request_hash: string;
};
type BillRow = {
  id: string;
  status: string;
  request_hash: string;
  provider_reference: string | null;
  ledger_hold_id: string | null;
  ledger_transaction_id: string | null;
};

export class BillPaymentService {
  constructor(
    private readonly db: Knex,
    private readonly routing: ProviderRoutingService,
    private readonly providers: BillPaymentProviderRegistry,
    private readonly ledger: BillLedgerGateway,
  ) {}

  async createQuote(input: {
    tenantId: string;
    customerId: string;
    productId: string;
    customerIdentifier: string;
    amountMinor: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<{
    quoteId: string;
    totalDebitMinor: string;
    expiresAt: string;
    replayed: boolean;
  }> {
    assertMoney(input.amountMinor);
    const routed = await this.routing.select({
      tenantId: input.tenantId,
      capability: "BILL_PAYMENT",
      currency: "NGN",
      correlationId: input.correlationId,
      idempotencyKey: `bill-quote:${input.idempotencyKey}:route`,
    });
    const product = await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("bill_products as p")
        .join("bill_providers as bp", function () {
          this.on("bp.id", "=", "p.provider_id").andOn(
            "bp.tenant_id",
            "=",
            "p.tenant_id",
          );
        })
        .where({
          "p.tenant_id": input.tenantId,
          "p.id": input.productId,
          "p.is_active": true,
          "bp.is_active": true,
        })
        .whereNotNull("p.published_at")
        .where("p.effective_from", "<=", tx.fn.now())
        .where((q) =>
          q
            .whereNull("p.effective_to")
            .orWhere("p.effective_to", ">", tx.fn.now()),
        )
        .first<{
          product_code: string;
          provider_code: string;
          denomination_type: string;
          amount: string | null;
          min_amount: string | null;
          max_amount: string | null;
          fee_amount: string;
          tax_amount: string;
          cashback_amount: string;
          currency: string;
          catalogue_version: number;
        }>("p.*", "bp.provider_code"),
    );
    if (!product || product.currency !== "NGN")
      throw new Error("Bill product is unavailable");
    if (product.provider_code !== routed.provider.code)
      throw new Error("Selected provider does not own this bill product");
    validateRange(product, input.amountMinor);
    const provider = this.providers.require(routed.provider.code);
    const validation = await provider.validateCustomer({
      productCode: product.product_code,
      customerIdentifier: input.customerIdentifier,
    });
    const requestHash = hash({
      customerId: input.customerId,
      productId: input.productId,
      customerIdentifier: input.customerIdentifier,
      amountMinor: input.amountMinor,
      routingDecisionId: routed.decisionId,
    });
    return withTenantTransaction(this.db, input.tenantId, async (tx) => {
      const existing = await tx("bill_payment_quotes")
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        })
        .first<QuoteRow>();
      if (existing) {
        if (existing.request_hash !== requestHash)
          throw new Error("Idempotency key reused with a different bill quote");
        return quoteResult(existing, true);
      }
      const validationId = randomUUID();
      const quoteId = randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      await tx("bill_customer_validations").insert({
        id: validationId,
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        product_id: input.productId,
        customer_identifier: input.customerIdentifier,
        normalized_customer_name: validation.customerName,
        provider_code: provider.code,
        provider_reference: validation.providerReference,
        routing_decision_id: routed.decisionId,
        idempotency_key: `${input.idempotencyKey}:validation`,
        request_hash: requestHash,
        evidence_hash: hash(validation.evidence),
        expires_at: expiresAt,
      });
      const total = (
        BigInt(input.amountMinor) +
        BigInt(product.fee_amount) +
        BigInt(product.tax_amount)
      ).toString();
      await tx("bill_payment_quotes").insert({
        id: quoteId,
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        product_id: input.productId,
        validation_id: validationId,
        amount: input.amountMinor,
        fee_amount: product.fee_amount,
        tax_amount: product.tax_amount,
        cashback_amount: product.cashback_amount,
        total_debit: total,
        currency: "NGN",
        catalogue_version: product.catalogue_version,
        provider_code: provider.code,
        routing_decision_id: routed.decisionId,
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        expires_at: expiresAt,
      });
      return {
        quoteId,
        totalDebitMinor: total,
        expiresAt: expiresAt.toISOString(),
        replayed: false,
      };
    });
  }

  async pay(input: {
    tenantId: string;
    customerId: string;
    sourceAccountId: string;
    providerPayableLedgerAccountId: string;
    revenueLedgerAccountId?: string;
    taxLedgerAccountId?: string;
    quoteId: string;
    customerIdentifier: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<{
    billTransactionId: string;
    status: string;
    replayed: boolean;
  }> {
    const quote = await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("bill_payment_quotes")
        .where({
          tenant_id: input.tenantId,
          id: input.quoteId,
          customer_id: input.customerId,
        })
        .first<QuoteRow>(),
    );
    if (!quote || new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("Bill quote is missing or expired");
    const commandHash = hash({
      customerId: input.customerId,
      sourceAccountId: input.sourceAccountId,
      quoteId: input.quoteId,
      customerIdentifier: input.customerIdentifier,
      totalDebitMinor: quote.total_debit,
    });
    const row = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("bill_transactions")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<BillRow>();
        if (existing) {
          if (existing.request_hash !== commandHash)
            throw new Error(
              "Idempotency key reused with a different bill payment",
            );
          return existing;
        }
        const source = await tx("financial_accounts")
          .where({
            tenant_id: input.tenantId,
            id: input.sourceAccountId,
            customer_id: input.customerId,
            currency: "NGN",
            status: "ACTIVE",
          })
          .first<{ ledger_account_id: string }>("ledger_account_id");
        if (!source?.ledger_account_id)
          throw new Error("Source account requires an active Ledger mapping");
        const product = await tx("bill_products")
          .where({ tenant_id: input.tenantId, id: quote.product_id })
          .first<{
            provider_id: string;
            category_id: string;
            product_code: string;
          }>();
        if (!product) throw new Error("Quoted product is unavailable");
        const id = randomUUID();
        await tx("bill_transactions").insert({
          id,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          source_account_id: input.sourceAccountId,
          category_id: product.category_id,
          provider_id: product.provider_id,
          product_id: quote.product_id,
          quote_id: quote.id,
          reference: `BILL-${id}`,
          customer_identifier: input.customerIdentifier,
          amount: quote.amount,
          fee_amount: quote.fee_amount,
          tax_amount: quote.tax_amount,
          cashback_amount: quote.cashback_amount,
          total_debit: quote.total_debit,
          currency: "NGN",
          status: "PENDING",
          channel: "MOBILE_APP",
          idempotency_key: input.idempotencyKey,
          request_hash: commandHash,
          routing_decision_id: quote.routing_decision_id,
          provider_selection_version: quote.catalogue_version,
          source_ledger_account_id: source.ledger_account_id,
          provider_payable_ledger_account_id:
            input.providerPayableLedgerAccountId,
          revenue_ledger_account_id: input.revenueLedgerAccountId,
          tax_ledger_account_id: input.taxLedgerAccountId,
        });
        return (await tx("bill_transactions").where({ id }).first<BillRow>())!;
      },
    );
    if (["SUCCESSFUL", "FAILED", "REVERSED", "REFUNDED"].includes(row.status))
      return { billTransactionId: row.id, status: row.status, replayed: true };
    const hold = row.ledger_hold_id
      ? { holdId: row.ledger_hold_id }
      : await this.ledger.createHold({
          tenantId: input.tenantId,
          idempotencyKey: `bill:${row.id}:hold`,
          accountId: await this.accountLedger(
            input.tenantId,
            input.sourceAccountId,
          ),
          amountMinor: quote.total_debit,
          currency: "NGN",
          purpose: "BILL_PAYMENT",
          expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        });
    if (!row.ledger_hold_id)
      await this.update(input.tenantId, row.id, {
        ledger_hold_id: hold.holdId,
        status: "PROCESSING",
      });
    const provider = this.providers.require(quote.provider_code);
    const product = await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("bill_products as p")
        .join("bill_categories as c", "c.id", "p.category_id")
        .where({ "p.tenant_id": input.tenantId, "p.id": quote.product_id })
        .first<{ product_code: string; category: string }>(
          "p.product_code",
          "c.category",
        ),
    );
    const attemptId = randomUUID();
    const priorAttempt = await withTenantTransaction(
      this.db,
      input.tenantId,
      (tx) =>
        tx("bill_transaction_attempts")
          .where({ tenant_id: input.tenantId, bill_transaction_id: row.id })
          .first<{ id: string; outcome_class: string }>(),
    );
    if (priorAttempt)
      return {
        billTransactionId: row.id,
        status: "PROCESSING",
        replayed: true,
      };
    await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("bill_transaction_attempts").insert({
        id: attemptId,
        tenant_id: input.tenantId,
        bill_transaction_id: row.id,
        attempt_number: 1,
        status: "PROCESSING",
        request_hash: commandHash,
        submission_state: "SUBMITTED",
        outcome_class: "AMBIGUOUS",
        evidence_hash: commandHash,
        started_at: tx.fn.now(),
        next_inquiry_at: new Date(Date.now() + 30_000),
      }),
    );
    let result;
    try {
      result = await provider.fulfil({
        transactionId: row.id,
        productCode: product!.product_code,
        customerIdentifier: input.customerIdentifier,
        amountMinor: quote.amount,
        idempotencyKey: input.idempotencyKey,
      });
    } catch {
      await this.updateAttempt(input.tenantId, attemptId, {
        status: "PENDING",
        outcome_class: "AMBIGUOUS",
        next_inquiry_at: new Date(Date.now() + 30_000),
      });
      await this.update(input.tenantId, row.id, {
        outcome_class: "AMBIGUOUS",
        next_inquiry_at: new Date(Date.now() + 30_000),
      });
      return {
        billTransactionId: row.id,
        status: "PROCESSING",
        replayed: false,
      };
    }
    if (result.state === "FAILED") {
      await this.ledger.releaseHold({
        tenantId: input.tenantId,
        idempotencyKey: `bill:${row.id}:release`,
        holdId: hold.holdId,
      });
      await this.update(input.tenantId, row.id, {
        status: "FAILED",
        outcome_class: "FINAL_FAILURE",
        provider_reference: result.providerReference,
      });
      await this.updateAttempt(input.tenantId, attemptId, {
        status: "FAILED",
        submission_state: "ACKNOWLEDGED",
        outcome_class: "FINAL_FAILURE",
        provider_reference: result.providerReference,
        completed_at: this.db.fn.now(),
      });
      return { billTransactionId: row.id, status: "FAILED", replayed: false };
    }
    if (result.state === "PENDING") {
      await this.update(input.tenantId, row.id, {
        outcome_class: "ACKNOWLEDGED_PENDING",
        provider_reference: result.providerReference,
        next_inquiry_at: new Date(Date.now() + 30_000),
      });
      await this.updateAttempt(input.tenantId, attemptId, {
        status: "PENDING",
        submission_state: "ACKNOWLEDGED",
        outcome_class: "ACKNOWLEDGED_PENDING",
        provider_reference: result.providerReference,
        next_inquiry_at: new Date(Date.now() + 30_000),
      });
      return {
        billTransactionId: row.id,
        status: "PROCESSING",
        replayed: false,
      };
    }
    const posting = await this.ledger.captureBillHold({
      tenantId: input.tenantId,
      idempotencyKey: `bill:${row.id}:capture`,
      holdId: hold.holdId,
      reference: `BILL-${row.id}`,
      sourceAccountId: await this.accountLedger(
        input.tenantId,
        input.sourceAccountId,
      ),
      providerPayableAccountId: input.providerPayableLedgerAccountId,
      ...(input.revenueLedgerAccountId
        ? { revenueAccountId: input.revenueLedgerAccountId }
        : {}),
      ...(input.taxLedgerAccountId
        ? { taxAccountId: input.taxLedgerAccountId }
        : {}),
      amountMinor: quote.amount,
      feeMinor: quote.fee_amount,
      taxMinor: quote.tax_amount,
    });
    await withTenantTransaction(this.db, input.tenantId, async (tx) => {
      await tx("bill_transaction_attempts")
        .where({ tenant_id: input.tenantId, id: attemptId })
        .update({
          status: "SUCCESSFUL",
          submission_state: "ACKNOWLEDGED",
          outcome_class: "FINAL_SUCCESS",
          provider_reference: result.providerReference,
          completed_at: tx.fn.now(),
        });
      await tx("bill_transactions")
        .where({ tenant_id: input.tenantId, id: row.id })
        .update({
          status: "SUCCESSFUL",
          outcome_class: "FINAL_SUCCESS",
          provider_reference: result.providerReference,
          ledger_transaction_id: posting.transactionId,
          response_payload: { receipt: result.receipt, token: result.token },
          completed_at: tx.fn.now(),
        });
      await tx("payment_outbox_events").insert({
        tenant_id: input.tenantId,
        aggregate_type: "bill_transaction",
        aggregate_id: row.id,
        event_type: "payment.bill-fulfilled.v1",
        event_version: 1,
        idempotency_key: `bill:${row.id}:fulfilled`,
        correlation_id: input.correlationId,
        payload: {
          bill_transaction_id: row.id,
          category: product!.category.toLowerCase(),
          amount_minor: quote.amount,
          currency: "NGN",
          provider_reference: result.providerReference,
          ledger_transaction_id: posting.transactionId,
          cashback_minor: quote.cashback_amount,
        },
      });
    });
    return { billTransactionId: row.id, status: "SUCCESSFUL", replayed: false };
  }
  private async accountLedger(
    tenantId: string,
    accountId: string,
  ): Promise<string> {
    const row = await withTenantTransaction(this.db, tenantId, (tx) =>
      tx("financial_accounts")
        .where({ tenant_id: tenantId, id: accountId })
        .first<{ ledger_account_id: string }>("ledger_account_id"),
    );
    if (!row?.ledger_account_id) throw new Error("Ledger mapping missing");
    return row.ledger_account_id;
  }
  private update(
    tenantId: string,
    id: string,
    values: object,
  ): Promise<number> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("bill_transactions").where({ tenant_id: tenantId, id }).update(values),
    );
  }
  private updateAttempt(
    tenantId: string,
    id: string,
    values: object,
  ): Promise<number> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("bill_transaction_attempts")
        .where({ tenant_id: tenantId, id })
        .update(values),
    );
  }
}
/** Requires a positive integer amount expressed in minor units. */
function assertMoney(value: string): void {
  if (!/^[1-9]\d*$/.test(value))
    throw new Error("Amount must be a positive integer minor-unit string");
}
/** Validates a bill amount against the product's fixed or variable denomination. */
function validateRange(
  product: {
    denomination_type: string;
    amount: string | null;
    min_amount: string | null;
    max_amount: string | null;
  },
  amount: string,
): void {
  const value = BigInt(amount);
  if (
    product.denomination_type === "FIXED" &&
    value !== BigInt(product.amount!)
  )
    throw new Error("Invalid fixed denomination");
  if (
    product.denomination_type === "VARIABLE" &&
    (value < BigInt(product.min_amount!) || value > BigInt(product.max_amount!))
  )
    throw new Error("Amount outside product range");
}
/** Hashes a JSON-serializable value for idempotency and evidence comparison. */
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
/** Maps a stored bill quote to the public quote result. */
function quoteResult(row: QuoteRow, replayed: boolean) {
  return {
    quoteId: row.id,
    totalDebitMinor: row.total_debit,
    expiresAt: new Date(row.expires_at).toISOString(),
    replayed,
  };
}
