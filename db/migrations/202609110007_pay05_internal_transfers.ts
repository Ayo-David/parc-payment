import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-18 through PAYMENT-DB-23. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_internal_transfers")) return;
  await knex.raw(`
    ALTER TABLE public.financial_accounts ADD COLUMN ledger_account_id uuid;
    CREATE UNIQUE INDEX uq_financial_ledger_account ON public.financial_accounts(ledger_account_id) WHERE ledger_account_id IS NOT NULL;

    ALTER TABLE public.payment_transactions DROP CONSTRAINT fk_payment_source_account;
    ALTER TABLE public.payment_transactions ADD CONSTRAINT fk_payment_source_account_tenant FOREIGN KEY(tenant_id,source_account_id) REFERENCES public.financial_accounts(tenant_id,id) ON DELETE RESTRICT;

    CREATE TABLE public.payment_internal_transfers(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      payment_id uuid NOT NULL, customer_id uuid NOT NULL,
      source_account_id uuid NOT NULL, destination_account_id uuid NOT NULL,
      source_ledger_account_id uuid NOT NULL, destination_ledger_account_id uuid NOT NULL,
      amount bigint NOT NULL CHECK(amount>0), currency char(3) NOT NULL,
      narration varchar(140) NOT NULL, idempotency_key varchar(255) NOT NULL,
      request_hash char(64) NOT NULL, correlation_id uuid NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'CREATED' CHECK(status IN('CREATED','RESERVED','CAPTURING','SUCCEEDED','FAILED','MANUAL_REVIEW')),
      ledger_hold_id uuid, ledger_transaction_id uuid,
      failure_code varchar(100), failure_reason text,
      reserved_at timestamptz, completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_internal_transfer_currency CHECK(currency ~ '^[A-Z]{3}$'),
      CONSTRAINT chk_internal_transfer_distinct_accounts CHECK(source_account_id<>destination_account_id AND source_ledger_account_id<>destination_ledger_account_id),
      CONSTRAINT uq_internal_transfer_idempotency UNIQUE(tenant_id,idempotency_key),
      CONSTRAINT uq_internal_transfer_payment UNIQUE(tenant_id,payment_id),
      CONSTRAINT uq_internal_transfer_tenant_id UNIQUE(tenant_id,id),
      CONSTRAINT fk_internal_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id),
      CONSTRAINT fk_internal_source_tenant FOREIGN KEY(tenant_id,source_account_id) REFERENCES public.financial_accounts(tenant_id,id),
      CONSTRAINT fk_internal_destination_tenant FOREIGN KEY(tenant_id,destination_account_id) REFERENCES public.financial_accounts(tenant_id,id)
    );
    CREATE TABLE public.payment_internal_transfer_history(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      transfer_id uuid NOT NULL, previous_status varchar(30), new_status varchar(30) NOT NULL,
      reason text, created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(tenant_id,transfer_id) REFERENCES public.payment_internal_transfers(tenant_id,id)
    );
    CREATE OR REPLACE FUNCTION public.validate_internal_transfer() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
    DECLARE src record; dst record; BEGIN
      SELECT tenant_id,currency,status,ledger_account_id INTO src FROM public.financial_accounts WHERE id=NEW.source_account_id;
      SELECT tenant_id,currency,status,ledger_account_id INTO dst FROM public.financial_accounts WHERE id=NEW.destination_account_id;
      IF src.tenant_id<>NEW.tenant_id OR dst.tenant_id<>NEW.tenant_id OR btrim(src.currency)<>btrim(NEW.currency) OR btrim(dst.currency)<>btrim(NEW.currency) THEN RAISE EXCEPTION 'Internal transfer tenant/currency mismatch'; END IF;
      IF src.status<>'ACTIVE' OR dst.status<>'ACTIVE' OR src.ledger_account_id IS DISTINCT FROM NEW.source_ledger_account_id OR dst.ledger_account_id IS DISTINCT FROM NEW.destination_ledger_account_id THEN RAISE EXCEPTION 'Internal transfer requires active mapped accounts'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status='CREATED' AND NEW.status IN('RESERVED','FAILED')) OR
        (OLD.status='RESERVED' AND NEW.status IN('CAPTURING','FAILED')) OR
        (OLD.status='CAPTURING' AND NEW.status IN('SUCCEEDED','MANUAL_REVIEW')) OR
        (OLD.status='MANUAL_REVIEW' AND NEW.status IN('CAPTURING','SUCCEEDED','FAILED'))
      ) THEN RAISE EXCEPTION 'Invalid internal transfer transition'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.customer_id,NEW.source_account_id,NEW.destination_account_id,NEW.source_ledger_account_id,NEW.destination_ledger_account_id,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.customer_id,OLD.source_account_id,OLD.destination_account_id,OLD.source_ledger_account_id,OLD.destination_ledger_account_id,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash) THEN RAISE EXCEPTION 'Internal transfer command evidence is immutable'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_validate_internal_transfer BEFORE INSERT OR UPDATE ON public.payment_internal_transfers FOR EACH ROW EXECUTE FUNCTION public.validate_internal_transfer();
    CREATE OR REPLACE FUNCTION public.record_internal_transfer_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_internal_transfer_history(tenant_id,transfer_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;
    CREATE TRIGGER trg_internal_transfer_status AFTER INSERT OR UPDATE OF status ON public.payment_internal_transfers FOR EACH ROW EXECUTE FUNCTION public.record_internal_transfer_status();
    CREATE OR REPLACE FUNCTION public.protect_internal_transfer_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Internal transfer history is immutable'; END $$;
    CREATE TRIGGER trg_protect_internal_transfer_history BEFORE UPDATE OR DELETE ON public.payment_internal_transfer_history FOR EACH ROW EXECUTE FUNCTION public.protect_internal_transfer_history();
    CREATE INDEX idx_internal_transfer_recovery ON public.payment_internal_transfers(status,updated_at) WHERE status IN('RESERVED','CAPTURING','MANUAL_REVIEW');
    ALTER TABLE public.payment_internal_transfers ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_internal_transfers FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_internal_transfer_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_internal_transfer_history FORCE ROW LEVEL SECURITY;
    CREATE POLICY internal_transfer_tenant_policy ON public.payment_internal_transfers USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY internal_transfer_history_tenant_policy ON public.payment_internal_transfer_history USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT,UPDATE ON public.payment_internal_transfers TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT,INSERT ON public.payment_internal_transfer_history TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("PAY-05 internal-transfer controls are forward-only"),
  );
}
