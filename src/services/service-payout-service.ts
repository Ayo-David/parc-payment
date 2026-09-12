import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import { ProviderOutcomeAmbiguousError } from "./payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

export class ServicePayoutService {
  constructor(
    private readonly db: Knex,
    private readonly routing: ProviderRoutingService,
  ) {}
  async submit(input: {
    tenantId: string;
    sourceService: "parc-lending";
    sourceResourceId: string;
    customerId: string;
    ledgerTransactionId: string;
    destinationReference: string;
    amountMinor: string;
    currency: "NGN";
    narration: string;
    idempotencyKey: string;
    correlationId: string;
    providerData: unknown;
  }) {
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Payout amount must be positive minor units");
    const requestHash = hash({
      ...input,
      providerData: hash(input.providerData),
    });
    const existing = await withTenantTransaction(
      this.db,
      input.tenantId,
      (tx) =>
        tx("payment_service_payouts")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<{ id: string; request_hash: string; status: string }>(),
    );
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new Error("Idempotency key reused with different payout");
      return { id: existing.id, status: existing.status, replayed: true };
    }
    const route = await this.routing.select({
      tenantId: input.tenantId,
      capability: "INTERBANK_TRANSFER",
      currency: input.currency,
      correlationId: input.correlationId,
      idempotencyKey: `service-payout:${input.idempotencyKey}:route`,
    });
    const id = randomUUID(),
      attemptId = randomUUID();
    await withTenantTransaction(this.db, input.tenantId, async (tx) => {
      await tx("payment_service_payouts").insert({
        id,
        tenant_id: input.tenantId,
        source_service: input.sourceService,
        source_resource_id: input.sourceResourceId,
        customer_id: input.customerId,
        ledger_transaction_id: input.ledgerTransactionId,
        destination_reference: input.destinationReference,
        amount: input.amountMinor,
        currency: input.currency,
        narration: input.narration,
        status: "SUBMITTING",
        routing_decision_id: route.decisionId,
        active_attempt_id: attemptId,
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        correlation_id: input.correlationId,
      });
      await tx("payment_service_payout_attempts").insert({
        id: attemptId,
        tenant_id: input.tenantId,
        payout_id: id,
        attempt_number: 1,
        provider_code: route.provider.code,
        submission_state: "SUBMITTED",
        outcome_certainty: "AMBIGUOUS",
        request_hash: requestHash,
      });
    });
    try {
      const outcome = await route.provider.submit({
        operationId: id,
        capability: "INTERBANK_TRANSFER",
        currency: input.currency,
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey,
        providerData: input.providerData,
      });
      const status =
        outcome.state === "SUCCESS"
          ? "SUCCEEDED"
          : outcome.state === "FAILED"
            ? "FAILED"
            : "PENDING";
      await this.record(
        input.tenantId,
        id,
        attemptId,
        status,
        outcome.providerReference,
        outcome.state === "PENDING",
      );
      return { id, status, replayed: false };
    } catch (error) {
      if (!(error instanceof ProviderOutcomeAmbiguousError)) throw error;
      await this.record(
        input.tenantId,
        id,
        attemptId,
        "PENDING",
        undefined,
        true,
      );
      return { id, status: "PENDING", replayed: false };
    }
  }
  private async record(
    tenantId: string,
    id: string,
    attemptId: string,
    status: string,
    reference: string | undefined,
    ambiguous: boolean,
  ) {
    await withTenantTransaction(this.db, tenantId, async (tx) => {
      await tx("payment_service_payout_attempts")
        .where({ tenant_id: tenantId, id: attemptId })
        .update({
          provider_reference: reference ?? null,
          submission_state: status === "SUCCEEDED" ? "SUCCESS" : status,
          outcome_certainty: ambiguous ? "AMBIGUOUS" : "CERTAIN",
          next_inquiry_at: ambiguous ? new Date(Date.now() + 30_000) : null,
          completed_at: ambiguous ? null : tx.fn.now(),
          evidence_hash: hash({ status, reference: reference ?? null }),
        });
      await tx("payment_service_payouts")
        .where({ tenant_id: tenantId, id })
        .update({
          status,
          next_inquiry_at: ambiguous ? new Date(Date.now() + 30_000) : null,
          completed_at: ambiguous ? null : tx.fn.now(),
        });
      const payout = await tx("payment_service_payouts")
        .where({ tenant_id: tenantId, id })
        .first<{ source_service: string; source_resource_id: string }>();
      await tx("payment_outbox_events").insert({
        tenant_id: tenantId,
        aggregate_type: "service_payout",
        aggregate_id: id,
        event_type: "payment.service-payout-outcome-recorded.v1",
        event_version: 1,
        idempotency_key: `service-payout:${id}:${status}`,
        payload: {
          payout_id: id,
          source_service: payout.source_service,
          source_resource_id: payout.source_resource_id,
          status,
          evidence_hash: hash({ status, reference: reference ?? null }),
        },
      });
    });
  }
}
/** Hashes payout evidence for immutable outbox events. */
function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
