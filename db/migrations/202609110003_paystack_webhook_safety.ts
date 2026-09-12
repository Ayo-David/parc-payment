import type { Knex } from "knex";
export const config = { transaction: false };

/** Approved PAYMENT-DB-06 through PAYMENT-DB-08. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn("payment_webhooks", "payload_hash")) return;
  await knex.raw(
    "ALTER TYPE public.webhook_status_enum ADD VALUE IF NOT EXISTS 'DEAD_LETTERED'",
  );
  await knex.raw(`
    ALTER TABLE public.payment_webhooks
      ALTER COLUMN event_reference SET NOT NULL,
      ADD COLUMN payload_hash char(64) NOT NULL,
      ADD COLUMN signature_verified boolean NOT NULL DEFAULT false,
      ADD COLUMN signature_hash char(64),
      ADD COLUMN processing_attempts integer NOT NULL DEFAULT 0 CHECK(processing_attempts>=0),
      ADD COLUMN processing_started_at timestamptz,
      ADD COLUMN lease_expires_at timestamptz,
      ADD COLUMN last_attempt_at timestamptz,
      ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 days');
    ALTER TABLE public.payment_webhooks DROP COLUMN signature;
    CREATE INDEX idx_payment_webhooks_due ON public.payment_webhooks(status,received_at) WHERE status IN ('RECEIVED','FAILED');
    CREATE INDEX idx_payment_webhooks_expiry ON public.payment_webhooks(expires_at);

    CREATE OR REPLACE FUNCTION public.protect_payment_webhook_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.provider_code IS DISTINCT FROM OLD.provider_code OR NEW.event_reference IS DISTINCT FROM OLD.event_reference OR NEW.event_type IS DISTINCT FROM OLD.event_type OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash OR NEW.signature_verified IS DISTINCT FROM OLD.signature_verified OR NEW.received_at IS DISTINCT FROM OLD.received_at THEN
        RAISE EXCEPTION 'Webhook receipt evidence is immutable';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_protect_payment_webhook_evidence BEFORE UPDATE ON public.payment_webhooks FOR EACH ROW EXECUTE FUNCTION public.protect_payment_webhook_evidence();

    CREATE OR REPLACE FUNCTION public.record_verified_payment_webhook(p_provider_code text,p_event_reference text,p_event_type text,p_payload jsonb,p_payload_hash text,p_signature_hash text)
    RETURNS TABLE(webhook_id uuid,replayed boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE existing public.payment_webhooks%ROWTYPE; inserted_id uuid;
    BEGIN
      IF p_provider_code<>'PAYSTACK' OR p_event_reference IS NULL OR length(p_payload_hash)<>64 OR length(p_signature_hash)<>64 THEN RAISE EXCEPTION 'Invalid verified webhook evidence'; END IF;
      INSERT INTO public.payment_webhooks(provider_code,event_reference,event_type,payload,payload_hash,signature_verified,signature_hash)
      VALUES(p_provider_code,p_event_reference,p_event_type,p_payload,p_payload_hash,true,p_signature_hash)
      ON CONFLICT(provider_code,event_reference) DO NOTHING RETURNING id INTO inserted_id;
      IF inserted_id IS NOT NULL THEN RETURN QUERY SELECT inserted_id,false; RETURN; END IF;
      SELECT * INTO existing FROM public.payment_webhooks WHERE provider_code=p_provider_code AND event_reference=p_event_reference;
      IF existing.payload_hash<>p_payload_hash THEN RAISE EXCEPTION 'Webhook identity reused with different payload'; END IF;
      RETURN QUERY SELECT existing.id,true;
    END $$;
    REVOKE ALL ON FUNCTION public.record_verified_payment_webhook(text,text,text,jsonb,text,text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.record_verified_payment_webhook(text,text,text,jsonb,text,text) TO parc_payment_runtime;

    CREATE OR REPLACE FUNCTION public.protect_submitted_payment_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.submission_state<>'NOT_SENT' AND (NEW.provider_code IS DISTINCT FROM OLD.provider_code OR NEW.routing_decision_id IS DISTINCT FROM OLD.routing_decision_id OR NEW.request_hash IS DISTINCT FROM OLD.request_hash OR NEW.request_payload IS DISTINCT FROM OLD.request_payload) THEN RAISE EXCEPTION 'Submitted provider-attempt request evidence is immutable'; END IF;
      IF NEW.outcome_certainty='AMBIGUOUS' AND NEW.submission_state='NOT_SENT' THEN RAISE EXCEPTION 'An unsubmitted attempt cannot have an ambiguous outcome'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_protect_submitted_payment_attempt BEFORE INSERT OR UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.protect_submitted_payment_attempt();
  `);
}
export function down(): Promise<never> {
  return Promise.reject(new Error("PAY-02 webhook safety is forward-only"));
}
