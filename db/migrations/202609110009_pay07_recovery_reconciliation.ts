import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-32 through PAYMENT-DB-40. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_reconciliation_runs")) return;
  await knex.raw(`
    ALTER TABLE public.payment_reversals DROP CONSTRAINT fk_payment_reversal;
    ALTER TABLE public.payment_reversals ADD CONSTRAINT fk_payment_reversal_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.payment_reversals ADD COLUMN idempotency_key varchar(255), ADD COLUMN request_hash char(64), ADD COLUMN original_ledger_transaction_id uuid, ADD COLUMN reversal_ledger_transaction_id uuid, ADD COLUMN approval_id uuid, ADD COLUMN automated_rule_id varchar(100), ADD COLUMN failure_code varchar(100), ADD COLUMN failure_reason text;
    ALTER TABLE public.payment_reversals ADD CONSTRAINT uq_payment_reversal_idempotency UNIQUE(tenant_id,idempotency_key);
    ALTER TABLE public.payment_reversals ADD CONSTRAINT uq_payment_reversal_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.payment_reversals ADD CONSTRAINT chk_reversal_authority CHECK((approval_id IS NOT NULL)::integer+(automated_rule_id IS NOT NULL)::integer=1);
    ALTER TABLE public.payment_reversals ADD CONSTRAINT uq_reversal_original_ledger UNIQUE(tenant_id,original_ledger_transaction_id);

    CREATE TABLE public.payment_reconciliation_runs(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      provider_code varchar(50) NOT NULL, period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
      source_object_reference varchar(500) NOT NULL, source_hash char(64) NOT NULL,
      idempotency_key varchar(255) NOT NULL, status varchar(30) NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','PROCESSING','COMPLETED','FAILED','DEAD_LETTER')),
      item_count integer NOT NULL DEFAULT 0 CHECK(item_count>=0), matched_count integer NOT NULL DEFAULT 0 CHECK(matched_count>=0),
      exception_count integer NOT NULL DEFAULT 0 CHECK(exception_count>=0), worker_id varchar(100), lease_expires_at timestamptz,
      retry_count integer NOT NULL DEFAULT 0 CHECK(retry_count>=0), last_error text,
      raw_evidence_expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days'),
      financial_record_retain_until timestamptz NOT NULL DEFAULT(now()+interval '7 years'),
      created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
      CONSTRAINT chk_reconciliation_period CHECK(period_end>period_start),
      CONSTRAINT uq_reconciliation_run_idempotency UNIQUE(tenant_id,idempotency_key),
      CONSTRAINT uq_reconciliation_source UNIQUE(tenant_id,provider_code,source_hash),
      CONSTRAINT uq_reconciliation_run_tenant_id UNIQUE(tenant_id,id)
    );
    ALTER TABLE public.payment_reconciliation_records ADD COLUMN run_id uuid, ADD COLUMN evidence_hash char(64), ADD COLUMN discrepancy_key char(64), ADD COLUMN financially_consequential boolean NOT NULL DEFAULT true, ADD COLUMN retain_until timestamptz NOT NULL DEFAULT(now()+interval '7 years');
    ALTER TABLE public.payment_reconciliation_records DROP CONSTRAINT fk_reconciliation_payment;
    ALTER TABLE public.payment_reconciliation_records ADD CONSTRAINT fk_reconciliation_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.payment_reconciliation_records DROP CONSTRAINT chk_reconciliation_difference;
    ALTER TABLE public.payment_reconciliation_records ADD CONSTRAINT fk_reconciliation_run_tenant FOREIGN KEY(tenant_id,run_id) REFERENCES public.payment_reconciliation_runs(tenant_id,id);
    CREATE UNIQUE INDEX uq_reconciliation_discrepancy ON public.payment_reconciliation_records(tenant_id,discrepancy_key) WHERE discrepancy_key IS NOT NULL;

    CREATE TABLE public.payment_reversal_history(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, reversal_id uuid NOT NULL,
      previous_status public.reversal_status_enum, new_status public.reversal_status_enum NOT NULL,
      reason text, created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(tenant_id,reversal_id) REFERENCES public.payment_reversals(tenant_id,id)
    );
    CREATE OR REPLACE FUNCTION public.validate_payment_reversal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.approval_id IS NULL AND NEW.automated_rule_id IS NULL THEN RAISE EXCEPTION 'Reversal authority is required'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash,NEW.original_ledger_transaction_id,NEW.approval_id,NEW.automated_rule_id) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash,OLD.original_ledger_transaction_id,OLD.approval_id,OLD.automated_rule_id) THEN RAISE EXCEPTION 'Reversal command evidence is immutable'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT((OLD.status='PENDING' AND NEW.status IN('PROCESSING','FAILED')) OR (OLD.status='PROCESSING' AND NEW.status IN('SUCCESSFUL','FAILED'))) THEN RAISE EXCEPTION 'Invalid reversal transition'; END IF; RETURN NEW;
    END $$;
    CREATE TRIGGER trg_validate_payment_reversal BEFORE INSERT OR UPDATE ON public.payment_reversals FOR EACH ROW EXECUTE FUNCTION public.validate_payment_reversal();
    CREATE OR REPLACE FUNCTION public.record_payment_reversal_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_reversal_history(tenant_id,reversal_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;
    CREATE TRIGGER trg_payment_reversal_status AFTER INSERT OR UPDATE OF status ON public.payment_reversals FOR EACH ROW EXECUTE FUNCTION public.record_payment_reversal_status();
    CREATE OR REPLACE FUNCTION public.protect_payment_reversal_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Reversal history is immutable'; END $$;
    CREATE TRIGGER trg_protect_payment_reversal_history BEFORE UPDATE OR DELETE ON public.payment_reversal_history FOR EACH ROW EXECUTE FUNCTION public.protect_payment_reversal_history();

    CREATE FUNCTION public.claim_due_payment_inquiries(p_worker_id text,p_limit integer,p_lease_seconds integer DEFAULT 60)
    RETURNS TABLE(attempt_id uuid,tenant_id uuid,external_transfer_id uuid,provider_code varchar,provider_reference varchar) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
      IF nullif(btrim(p_worker_id),'') IS NULL OR p_limit<1 OR p_limit>100 OR p_lease_seconds<10 OR p_lease_seconds>600 THEN RAISE EXCEPTION 'Invalid inquiry claim'; END IF;
      RETURN QUERY WITH due AS (SELECT a.id FROM public.payment_attempts a WHERE a.outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS') AND a.next_inquiry_at<=now() AND (a.inquiry_lease_expires_at IS NULL OR a.inquiry_lease_expires_at<now()) ORDER BY a.next_inquiry_at FOR UPDATE SKIP LOCKED LIMIT p_limit), claimed AS (UPDATE public.payment_attempts a SET inquiry_lease_expires_at=now()+make_interval(secs=>p_lease_seconds),last_inquiry_at=now(),inquiry_attempts=a.inquiry_attempts+1 FROM due WHERE a.id=due.id RETURNING a.*) SELECT c.id,c.tenant_id,c.external_transfer_id,c.provider_code,c.provider_reference FROM claimed c;
    END $$;
    REVOKE ALL ON FUNCTION public.claim_due_payment_inquiries(text,integer,integer) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.claim_due_payment_inquiries(text,integer,integer) TO parc_payment_worker;
    CREATE INDEX idx_reconciliation_run_claim ON public.payment_reconciliation_runs(status,lease_expires_at,created_at) WHERE status IN('PENDING','PROCESSING');

    ALTER TABLE public.payment_reconciliation_runs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_reconciliation_runs FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_reversal_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_reversal_history FORCE ROW LEVEL SECURITY;
    CREATE POLICY reconciliation_run_tenant_policy ON public.payment_reconciliation_runs USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY reversal_history_tenant_policy ON public.payment_reversal_history USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT,UPDATE ON public.payment_reconciliation_runs TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT,INSERT ON public.payment_reversal_history TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("PAY-07 recovery and reconciliation controls are forward-only"),
  );
}
