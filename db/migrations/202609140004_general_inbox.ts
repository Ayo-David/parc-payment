import type { Knex } from "knex";

/** Previously approved general Payment inbox for versioned cross-service events. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_inbox_events")) {
    await hardenInbox(knex);
    return;
  }
  await knex.raw(`
    CREATE TYPE public.payment_inbox_status_enum AS ENUM
      ('RECEIVED','PROCESSING','PROCESSED','FAILED','DEAD_LETTER');
    CREATE TABLE public.payment_inbox_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      event_id uuid NOT NULL, source_service varchar(100) NOT NULL,
      event_type varchar(150) NOT NULL, event_version integer NOT NULL CHECK(event_version>0),
      aggregate_type varchar(100), aggregate_id uuid, correlation_id uuid, causation_id uuid,
      payload jsonb NOT NULL, headers jsonb NOT NULL DEFAULT '{}'::jsonb,
      status public.payment_inbox_status_enum NOT NULL DEFAULT 'RECEIVED',
      attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
      received_at timestamptz NOT NULL DEFAULT now(), processing_started_at timestamptz,
      processed_at timestamptz, next_attempt_at timestamptz,
      last_error_code varchar(100), last_error_message text,
      UNIQUE(source_service,event_id), UNIQUE(tenant_id,id)
    );
    CREATE INDEX idx_payment_inbox_pending
      ON public.payment_inbox_events(status,next_attempt_at,received_at)
      WHERE status IN('RECEIVED','FAILED');
    CREATE INDEX idx_payment_inbox_tenant_received
      ON public.payment_inbox_events(tenant_id,received_at DESC);
    ALTER TABLE public.payment_inbox_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_inbox_events FORCE ROW LEVEL SECURITY;
    CREATE POLICY payment_inbox_tenant_policy ON public.payment_inbox_events
      USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    REVOKE ALL ON public.payment_inbox_events FROM PUBLIC,parc_payment_runtime,parc_payment_readonly;
    GRANT SELECT,INSERT,UPDATE ON public.payment_inbox_events TO parc_payment_worker;
    GRANT SELECT ON public.payment_inbox_events TO parc_payment_readonly;
  `);
}

async function hardenInbox(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE public.payment_inbox_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_inbox_events FORCE ROW LEVEL SECURITY;
    DO $policy$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_inbox_events' AND policyname='payment_inbox_tenant_policy') THEN
        CREATE POLICY payment_inbox_tenant_policy ON public.payment_inbox_events
          USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
      END IF;
    END $policy$;
    REVOKE ALL ON public.payment_inbox_events FROM PUBLIC,parc_payment_runtime,parc_payment_readonly,parc_payment_worker;
    GRANT SELECT,INSERT,UPDATE ON public.payment_inbox_events TO parc_payment_worker;
    GRANT SELECT ON public.payment_inbox_events TO parc_payment_readonly;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(new Error("General Payment inbox is forward-only"));
}
