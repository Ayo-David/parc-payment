import type { Knex } from "knex";

export interface PaymentInboxEvent {
  eventId: string;
  tenantId: string;
  sourceService: string;
  eventType: string;
  eventVersion: number;
  aggregateType?: string;
  aggregateId?: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

export class PaymentInboxRepository {
  public constructor(private readonly db: Knex | Knex.Transaction) {}

  public async receive(
    event: PaymentInboxEvent,
  ): Promise<{ id: string; duplicate: boolean }> {
    const inserted = await this.db("payment_inbox_events")
      .insert({
        tenant_id: event.tenantId,
        event_id: event.eventId,
        source_service: event.sourceService,
        event_type: event.eventType,
        event_version: event.eventVersion,
        aggregate_type: event.aggregateType ?? null,
        aggregate_id: event.aggregateId ?? null,
        correlation_id: event.correlationId ?? null,
        causation_id: event.causationId ?? null,
        payload: event.payload,
        headers: event.headers ?? {},
      })
      .onConflict(["source_service", "event_id"])
      .ignore()
      .returning<{ id: string }[]>("id");
    if (inserted[0]) return { id: inserted[0].id, duplicate: false };
    const existing = await this.db("payment_inbox_events")
      .select<{ id: string }[]>("id", "tenant_id")
      .where({ source_service: event.sourceService, event_id: event.eventId })
      .first();
    if (!existing) throw new Error("INBOX_DEDUPLICATION_RECORD_NOT_VISIBLE");
    return { id: existing.id, duplicate: true };
  }

  public async markProcessing(id: string): Promise<boolean> {
    return (
      (await this.db("payment_inbox_events")
        .where({ id, status: "RECEIVED" })
        .update({
          status: "PROCESSING",
          processing_started_at: this.db.fn.now(),
          attempt_count: this.db.raw("attempt_count+1"),
        })) === 1
    );
  }

  public async markProcessed(id: string): Promise<boolean> {
    return (
      (await this.db("payment_inbox_events")
        .where({ id, status: "PROCESSING" })
        .update({
          status: "PROCESSED",
          processed_at: this.db.fn.now(),
          next_attempt_at: null,
          last_error_code: null,
          last_error_message: null,
        })) === 1
    );
  }

  public async markFailed(input: {
    id: string;
    code: string;
    message: string;
    retryAt?: Date;
  }): Promise<boolean> {
    return (
      (await this.db("payment_inbox_events")
        .where({ id: input.id, status: "PROCESSING" })
        .update({
          status: input.retryAt ? "FAILED" : "DEAD_LETTER",
          next_attempt_at: input.retryAt ?? null,
          last_error_code: input.code.slice(0, 100),
          last_error_message: input.message.slice(0, 1000),
        })) === 1
    );
  }
}
