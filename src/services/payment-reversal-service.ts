import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { LedgerReversalGateway } from "./ledger-gateway.js";

export interface PaymentApprovalGateway {
  consume(input: {
    tenantId: string;
    approvalId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    payloadHash: string;
    idempotencyKey: string;
  }): Promise<void>;
}

export class PaymentReversalService {
  public constructor(
    private readonly db: Knex,
    private readonly ledger: LedgerReversalGateway,
    private readonly approvals?: PaymentApprovalGateway,
  ) {}

  public async reverse(input: {
    tenantId: string;
    paymentId: string;
    originalLedgerTransactionId: string;
    amountMinor: string;
    currency: string;
    reason: string;
    idempotencyKey: string;
    correlationId: string;
    approvalId?: string;
    automatedRuleId?: string;
  }): Promise<{
    reversalId: string;
    ledgerTransactionId: string;
    replayed: boolean;
  }> {
    if ((input.approvalId ? 1 : 0) + (input.automatedRuleId ? 1 : 0) !== 1)
      throw new Error("Exactly one reversal authority is required");
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Reversal amount must be positive minor units");
    const requestHash = hash({
      paymentId: input.paymentId,
      originalLedgerTransactionId: input.originalLedgerTransactionId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      reason: input.reason,
      approvalId: input.approvalId ?? null,
      automatedRuleId: input.automatedRuleId ?? null,
    });
    if (input.approvalId) {
      if (!this.approvals) throw new Error("Approval gateway is unavailable");
      await this.approvals.consume({
        tenantId: input.tenantId,
        approvalId: input.approvalId,
        action: "MANUAL_PAYMENT_REVERSAL",
        resourceType: "payment",
        resourceId: input.paymentId,
        payloadHash: requestHash,
        idempotencyKey: input.idempotencyKey,
      });
    }
    const row = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("payment_reversals")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<{
            id: string;
            request_hash: string;
            status: string;
            reversal_ledger_transaction_id: string | null;
          }>();
        if (existing) {
          if (existing.request_hash !== requestHash)
            throw new Error("Reversal idempotency mismatch");
          return existing;
        }
        const payment = await tx("payment_transactions")
          .where({
            tenant_id: input.tenantId,
            id: input.paymentId,
            status: "SUCCESSFUL",
            currency: input.currency,
          })
          .first<{ amount: string }>("amount");
        if (!payment || String(payment.amount) !== input.amountMinor)
          throw new Error(
            "Only the complete successful payment may be reversed",
          );
        const id = randomUUID();
        await tx("payment_reversals").insert({
          id,
          tenant_id: input.tenantId,
          payment_id: input.paymentId,
          amount: input.amountMinor,
          currency: input.currency,
          reason: input.reason,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
          original_ledger_transaction_id: input.originalLedgerTransactionId,
          ...(input.approvalId ? { approval_id: input.approvalId } : {}),
          ...(input.automatedRuleId
            ? { automated_rule_id: input.automatedRuleId }
            : {}),
        });
        return {
          id,
          request_hash: requestHash,
          status: "PENDING",
          reversal_ledger_transaction_id: null,
        };
      },
    );
    if (row.status === "SUCCESSFUL" && row.reversal_ledger_transaction_id)
      return {
        reversalId: row.id,
        ledgerTransactionId: row.reversal_ledger_transaction_id,
        replayed: true,
      };
    await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("payment_reversals")
        .where({ tenant_id: input.tenantId, id: row.id, status: "PENDING" })
        .update({ status: "PROCESSING" }),
    );
    try {
      const result = await this.ledger.reverseTransaction({
        tenantId: input.tenantId,
        transactionId: input.originalLedgerTransactionId,
        idempotencyKey: `payment-reversal:${row.id}`,
        reason: input.reason,
        ...(input.approvalId ? { approvalId: input.approvalId } : {}),
        ...(input.automatedRuleId
          ? { automatedRuleId: input.automatedRuleId }
          : {}),
      });
      await withTenantTransaction(this.db, input.tenantId, async (tx) => {
        await tx("payment_reversals")
          .where({ tenant_id: input.tenantId, id: row.id })
          .update({
            status: "SUCCESSFUL",
            reversal_ledger_transaction_id: result.reversalTransactionId,
            completed_at: tx.fn.now(),
          });
        await tx("payment_transactions")
          .where({ tenant_id: input.tenantId, id: input.paymentId })
          .update({ status: "REVERSED" });
        await tx("payment_outbox_events")
          .insert({
            tenant_id: input.tenantId,
            aggregate_type: "payment_transaction",
            aggregate_id: input.paymentId,
            event_type: "payment.reversed.v1",
            event_version: 1,
            idempotency_key: `payment-reversal:${row.id}:completed`,
            correlation_id: input.correlationId,
            payload: {
              payment_id: input.paymentId,
              reversal_id: row.id,
              ledger_transaction_id: result.reversalTransactionId,
            },
          })
          .onConflict(["tenant_id", "idempotency_key"])
          .ignore();
      });
      return {
        reversalId: row.id,
        ledgerTransactionId: result.reversalTransactionId,
        replayed: result.replayed,
      };
    } catch (error) {
      await withTenantTransaction(this.db, input.tenantId, (tx) =>
        tx("payment_reversals")
          .where({ tenant_id: input.tenantId, id: row.id })
          .update({
            status: "FAILED",
            failure_code: "LEDGER_REVERSAL_FAILED",
            failure_reason:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Ledger reversal failed",
            completed_at: tx.fn.now(),
          }),
      );
      throw error;
    }
  }
}

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
