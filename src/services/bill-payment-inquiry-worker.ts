import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { BillLedgerGateway } from "./ledger-gateway.js";
import type { BillPaymentProviderRegistry } from "./bill-payment-provider.js";

type Claim = {
  attempt_id: string;
  tenant_id: string;
  bill_transaction_id: string;
  provider_code: string;
  provider_reference: string;
  inquiry_attempts: number;
};

type Bill = {
  id: string;
  status: string;
  ledger_hold_id: string | null;
  ledger_transaction_id: string | null;
  source_ledger_account_id: string | null;
  provider_payable_ledger_account_id: string | null;
  revenue_ledger_account_id: string | null;
  tax_ledger_account_id: string | null;
  amount: string;
  fee_amount: string;
  tax_amount: string;
  cashback_amount: string;
  currency: string;
  category: string;
};

export class BillPaymentInquiryWorker {
  constructor(
    private readonly db: Knex,
    private readonly providers: BillPaymentProviderRegistry,
    private readonly ledger: BillLedgerGateway,
    private readonly workerId: string,
  ) {}

  async runBatch(limit = 25): Promise<number> {
    const result = await this.db.raw<{ rows: Claim[] }>(
      "SELECT * FROM public.claim_due_bill_inquiries(?,?,?)",
      [this.workerId, limit, 60],
    );
    for (const claim of result.rows) await this.process(claim);
    return result.rows.length;
  }

  private async process(claim: Claim): Promise<void> {
    const provider = this.providers.require(claim.provider_code);
    try {
      const result = await provider.inquire(claim.provider_reference);
      if (result.state === "PENDING") {
        await this.defer(claim, "ACKNOWLEDGED_PENDING");
        return;
      }
      const bill = await this.bill(claim);
      if (!bill || bill.status !== "PROCESSING") {
        await this.releaseLease(claim);
        return;
      }
      if (result.state === "FAILED") {
        if (!bill.ledger_hold_id)
          throw new Error("Bill Ledger hold is missing");
        await this.ledger.releaseHold({
          tenantId: claim.tenant_id,
          idempotencyKey: `bill:${bill.id}:release`,
          holdId: bill.ledger_hold_id,
        });
        await withTenantTransaction(this.db, claim.tenant_id, async (tx) => {
          await tx("bill_transaction_attempts")
            .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
            .update({
              status: "FAILED",
              submission_state: "ACKNOWLEDGED",
              outcome_class: "FINAL_FAILURE",
              provider_reference: result.providerReference,
              next_inquiry_at: null,
              inquiry_lease_expires_at: null,
              completed_at: tx.fn.now(),
            });
          await tx("bill_transactions")
            .where({ tenant_id: claim.tenant_id, id: bill.id })
            .update({
              status: "FAILED",
              outcome_class: "FINAL_FAILURE",
              provider_reference: result.providerReference,
              next_inquiry_at: null,
              completed_at: tx.fn.now(),
            });
        });
        return;
      }
      await this.complete(claim, bill, result);
    } catch (error) {
      await this.defer(
        claim,
        "AMBIGUOUS",
        error instanceof Error ? error.message : "Bill inquiry failed",
      );
    }
  }

  private async complete(
    claim: Claim,
    bill: Bill,
    result: {
      providerReference: string;
      receipt?: string;
      token?: string;
    },
  ): Promise<void> {
    if (
      !bill.ledger_hold_id ||
      !bill.source_ledger_account_id ||
      !bill.provider_payable_ledger_account_id
    )
      throw new Error("Bill Ledger settlement configuration is incomplete");
    const posting = bill.ledger_transaction_id
      ? { transactionId: bill.ledger_transaction_id, replayed: true }
      : await this.ledger.captureBillHold({
          tenantId: claim.tenant_id,
          idempotencyKey: `bill:${bill.id}:capture`,
          holdId: bill.ledger_hold_id,
          reference: `BILL-${bill.id}`,
          sourceAccountId: bill.source_ledger_account_id,
          providerPayableAccountId: bill.provider_payable_ledger_account_id,
          ...(bill.revenue_ledger_account_id
            ? { revenueAccountId: bill.revenue_ledger_account_id }
            : {}),
          ...(bill.tax_ledger_account_id
            ? { taxAccountId: bill.tax_ledger_account_id }
            : {}),
          amountMinor: bill.amount,
          feeMinor: bill.fee_amount,
          taxMinor: bill.tax_amount,
        });
    await withTenantTransaction(this.db, claim.tenant_id, async (tx) => {
      await tx("bill_transaction_attempts")
        .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
        .update({
          status: "SUCCESSFUL",
          submission_state: "ACKNOWLEDGED",
          outcome_class: "FINAL_SUCCESS",
          provider_reference: result.providerReference,
          next_inquiry_at: null,
          inquiry_lease_expires_at: null,
          completed_at: tx.fn.now(),
        });
      await tx("bill_transactions")
        .where({ tenant_id: claim.tenant_id, id: bill.id })
        .update({
          status: "SUCCESSFUL",
          outcome_class: "FINAL_SUCCESS",
          provider_reference: result.providerReference,
          ledger_transaction_id: posting.transactionId,
          response_payload: { receipt: result.receipt, token: result.token },
          next_inquiry_at: null,
          completed_at: tx.fn.now(),
        });
      await tx("payment_outbox_events")
        .insert({
          tenant_id: claim.tenant_id,
          aggregate_type: "bill_transaction",
          aggregate_id: bill.id,
          event_type: "payment.bill-fulfilled.v1",
          event_version: 1,
          idempotency_key: `bill:${bill.id}:fulfilled`,
          correlation_id: claim.attempt_id,
          payload: {
            bill_transaction_id: bill.id,
            category: bill.category.toLowerCase(),
            amount_minor: bill.amount,
            currency: bill.currency,
            provider_reference: result.providerReference,
            ledger_transaction_id: posting.transactionId,
            cashback_minor: bill.cashback_amount,
          },
        })
        .onConflict(["tenant_id", "idempotency_key"])
        .ignore();
    });
  }

  private bill(claim: Claim): Promise<Bill | undefined> {
    return withTenantTransaction(this.db, claim.tenant_id, (tx) =>
      tx("bill_transactions as b")
        .join("bill_categories as c", "c.id", "b.category_id")
        .where({
          "b.tenant_id": claim.tenant_id,
          "b.id": claim.bill_transaction_id,
        })
        .first<Bill>("b.*", "c.category"),
    );
  }

  private defer(
    claim: Claim,
    outcome: "ACKNOWLEDGED_PENDING" | "AMBIGUOUS",
    failureReason?: string,
  ): Promise<void> {
    const exhausted = claim.inquiry_attempts >= 5;
    return withTenantTransaction(this.db, claim.tenant_id, async (tx) => {
      await tx("bill_transaction_attempts")
        .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
        .update({
          status: "PENDING",
          outcome_class: outcome,
          inquiry_lease_expires_at: null,
          next_inquiry_at: exhausted ? null : new Date(Date.now() + 60_000),
          ...(failureReason
            ? { failure_reason: failureReason.slice(0, 500) }
            : {}),
        });
      await tx("bill_transactions")
        .where({ tenant_id: claim.tenant_id, id: claim.bill_transaction_id })
        .update({
          outcome_class: outcome,
          next_inquiry_at: exhausted ? null : new Date(Date.now() + 60_000),
          ...(exhausted
            ? {
                failure_code: "INQUIRY_RETRIES_EXHAUSTED",
                failure_reason:
                  "Provider outcome unresolved after five inquiries",
              }
            : {}),
        });
    });
  }

  private releaseLease(claim: Claim): Promise<number> {
    return withTenantTransaction(this.db, claim.tenant_id, (tx) =>
      tx("bill_transaction_attempts")
        .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
        .update({ inquiry_lease_expires_at: null, next_inquiry_at: null }),
    );
  }
}
