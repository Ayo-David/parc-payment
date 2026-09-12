import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";

export class ReconciliationService {
  public constructor(private readonly db: Knex) {}

  public async reconcile(input: {
    tenantId: string;
    providerCode: string;
    periodStart: string;
    periodEnd: string;
    sourceObjectReference: string;
    sourceHash: string;
    idempotencyKey: string;
    items: Array<{
      providerReference: string;
      amountMinor: string;
      currency: string;
      evidenceHash: string;
    }>;
  }): Promise<{
    runId: string;
    matched: number;
    exceptions: number;
    replayed: boolean;
  }> {
    if (!/^[a-f0-9]{64}$/i.test(input.sourceHash))
      throw new Error("Reconciliation source hash is invalid");
    return withTenantTransaction(this.db, input.tenantId, async (tx) => {
      const existing = await tx("payment_reconciliation_runs")
        .where({
          tenant_id: input.tenantId,
          idempotency_key: input.idempotencyKey,
        })
        .first<{
          id: string;
          source_hash: string;
          matched_count: number;
          exception_count: number;
        }>();
      if (existing) {
        if (existing.source_hash !== input.sourceHash)
          throw new Error("Reconciliation idempotency mismatch");
        return {
          runId: existing.id,
          matched: existing.matched_count,
          exceptions: existing.exception_count,
          replayed: true,
        };
      }
      const runId = randomUUID();
      await tx("payment_reconciliation_runs").insert({
        id: runId,
        tenant_id: input.tenantId,
        provider_code: input.providerCode,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        source_object_reference: input.sourceObjectReference,
        source_hash: input.sourceHash.toLowerCase(),
        idempotency_key: input.idempotencyKey,
        status: "PROCESSING",
      });
      let matched = 0;
      let exceptions = 0;
      for (const item of input.items) {
        const attempt = await tx("payment_attempts as a")
          .join("payment_transactions as p", function () {
            this.on("p.id", "=", "a.payment_id").andOn(
              "p.tenant_id",
              "=",
              "a.tenant_id",
            );
          })
          .where({
            "a.tenant_id": input.tenantId,
            "a.provider_code": input.providerCode,
            "a.provider_reference": item.providerReference,
          })
          .first<{ payment_id: string; amount: string }>(
            "p.id as payment_id",
            "p.amount",
          );
        const internalAmount = attempt ? BigInt(attempt.amount) : 0n;
        const difference = BigInt(item.amountMinor) - internalAmount;
        const status = attempt && difference === 0n ? "MATCHED" : "EXCEPTION";
        if (status === "MATCHED") matched += 1;
        else exceptions += 1;
        const discrepancyKey = createHash("sha256")
          .update(
            `${input.tenantId}:${input.providerCode}:${item.providerReference}`,
          )
          .digest("hex");
        await tx("payment_reconciliation_records").insert({
          tenant_id: input.tenantId,
          run_id: runId,
          ...(attempt
            ? {
                payment_id: attempt.payment_id,
                resource_id: attempt.payment_id,
              }
            : { resource_id: runId }),
          resource_type: "PAYMENT",
          provider_code: input.providerCode,
          provider_reference: item.providerReference,
          provider_amount: item.amountMinor,
          internal_amount: internalAmount.toString(),
          currency: item.currency,
          status,
          difference_amount: difference.toString(),
          reconciliation_date: input.periodEnd.slice(0, 10),
          evidence_hash: item.evidenceHash,
          discrepancy_key: discrepancyKey,
        });
      }
      await tx("payment_reconciliation_runs").where({ id: runId }).update({
        status: "COMPLETED",
        item_count: input.items.length,
        matched_count: matched,
        exception_count: exceptions,
        completed_at: tx.fn.now(),
      });
      return { runId, matched, exceptions, replayed: false };
    });
  }
}
