import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-24 through PAYMENT-DB-31. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_external_transfers")) return;
  await knex.raw(`
    ALTER TABLE public.beneficiaries ADD CONSTRAINT uq_beneficiary_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.payment_transactions DROP CONSTRAINT fk_payment_beneficiary;
    ALTER TABLE public.payment_transactions ADD CONSTRAINT fk_payment_beneficiary_tenant FOREIGN KEY(tenant_id,beneficiary_id) REFERENCES public.beneficiaries(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.payment_provider_transactions DROP CONSTRAINT fk_provider_payment;
    ALTER TABLE public.payment_provider_transactions ADD CONSTRAINT fk_provider_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.payment_provider_transactions ADD CONSTRAINT uq_provider_payment_tenant_id UNIQUE(tenant_id,id);

    ALTER TABLE public.payment_attempts
      ADD COLUMN outcome_class varchar(40) NOT NULL DEFAULT 'NOT_SENT' CHECK(outcome_class IN('NOT_SENT','DEFINITE_PRE_SUBMISSION_FAILURE','ACKNOWLEDGED_PENDING','AMBIGUOUS','FINAL_SUCCESS','FINAL_FAILURE','REVERSED')),
      ADD COLUMN inquiry_attempts integer NOT NULL DEFAULT 0 CHECK(inquiry_attempts>=0),
      ADD COLUMN next_inquiry_at timestamptz,
      ADD COLUMN inquiry_lease_expires_at timestamptz,
      ADD COLUMN last_inquiry_at timestamptz;
    ALTER TABLE public.payment_attempts ALTER COLUMN outcome_class DROP DEFAULT;
    ALTER TABLE public.payment_attempts ADD CONSTRAINT uq_payment_attempt_tenant_id UNIQUE(tenant_id,id);

    CREATE TABLE public.payment_external_transfers(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      payment_id uuid NOT NULL, customer_id uuid NOT NULL, source_account_id uuid NOT NULL,
      source_ledger_account_id uuid NOT NULL, settlement_ledger_account_id uuid NOT NULL, beneficiary_id uuid,
      beneficiary_name varchar(200) NOT NULL, destination_account_number varchar(100) NOT NULL,
      destination_bank_code varchar(20) NOT NULL, destination_bank_name varchar(150),
      destination_phone_number varchar(30), amount bigint NOT NULL CHECK(amount>0),
      currency char(3) NOT NULL, narration varchar(100) NOT NULL,
      idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL,
      correlation_id uuid NOT NULL, status varchar(30) NOT NULL DEFAULT 'CREATED'
        CHECK(status IN('CREATED','RESERVED','SUBMITTING','PENDING','SUCCEEDED','FAILED','REVERSED','MANUAL_REVIEW')),
      ledger_hold_id uuid, ledger_transaction_id uuid, active_attempt_id uuid,
      failure_code varchar(100), failure_reason text, reserved_at timestamptz,
      submitted_at timestamptz, completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_external_currency CHECK(currency ~ '^[A-Z]{3}$'),
      CONSTRAINT uq_external_idempotency UNIQUE(tenant_id,idempotency_key),
      CONSTRAINT uq_external_payment UNIQUE(tenant_id,payment_id),
      CONSTRAINT uq_external_tenant_id UNIQUE(tenant_id,id),
      CONSTRAINT fk_external_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id),
      CONSTRAINT fk_external_source_tenant FOREIGN KEY(tenant_id,source_account_id) REFERENCES public.financial_accounts(tenant_id,id),
      CONSTRAINT fk_external_beneficiary_tenant FOREIGN KEY(tenant_id,beneficiary_id) REFERENCES public.beneficiaries(tenant_id,id)
    );
    ALTER TABLE public.payment_attempts ADD COLUMN external_transfer_id uuid;
    ALTER TABLE public.payment_attempts ADD CONSTRAINT fk_attempt_external_tenant FOREIGN KEY(tenant_id,external_transfer_id) REFERENCES public.payment_external_transfers(tenant_id,id);
    ALTER TABLE public.payment_external_transfers ADD CONSTRAINT fk_external_active_attempt_tenant FOREIGN KEY(tenant_id,active_attempt_id) REFERENCES public.payment_attempts(tenant_id,id) DEFERRABLE INITIALLY DEFERRED;
    CREATE UNIQUE INDEX uq_provider_attempt_reference ON public.payment_attempts(provider_code,provider_reference) WHERE provider_reference IS NOT NULL;
    CREATE INDEX idx_external_recovery ON public.payment_external_transfers(status,updated_at) WHERE status IN('RESERVED','SUBMITTING','PENDING','MANUAL_REVIEW');
    CREATE INDEX idx_attempt_inquiry_due ON public.payment_attempts(next_inquiry_at) WHERE outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS');

    CREATE TABLE public.payment_external_transfer_history(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      transfer_id uuid NOT NULL, previous_status varchar(30), new_status varchar(30) NOT NULL,
      reason text, created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(tenant_id,transfer_id) REFERENCES public.payment_external_transfers(tenant_id,id)
    );
    CREATE OR REPLACE FUNCTION public.validate_external_transfer() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
    DECLARE src record; BEGIN
      SELECT tenant_id,currency,status,customer_id,ledger_account_id INTO src FROM public.financial_accounts WHERE id=NEW.source_account_id;
      IF src.tenant_id<>NEW.tenant_id OR btrim(src.currency)<>btrim(NEW.currency) OR src.status<>'ACTIVE' OR src.customer_id<>NEW.customer_id OR src.ledger_account_id IS DISTINCT FROM NEW.source_ledger_account_id THEN RAISE EXCEPTION 'External transfer requires an owned active mapped source account'; END IF;
      IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status='CREATED' AND NEW.status IN('RESERVED','FAILED')) OR (OLD.status='RESERVED' AND NEW.status IN('SUBMITTING','FAILED')) OR
        (OLD.status='SUBMITTING' AND NEW.status IN('PENDING','SUCCEEDED','FAILED','MANUAL_REVIEW')) OR
        (OLD.status='PENDING' AND NEW.status IN('SUCCEEDED','FAILED','REVERSED','MANUAL_REVIEW')) OR
        (OLD.status='MANUAL_REVIEW' AND NEW.status IN('PENDING','SUCCEEDED','FAILED','REVERSED')) OR
        (OLD.status='SUCCEEDED' AND NEW.status='REVERSED')
      ) THEN RAISE EXCEPTION 'Invalid external transfer transition'; END IF;
      IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.payment_id,NEW.customer_id,NEW.source_account_id,NEW.source_ledger_account_id,NEW.settlement_ledger_account_id,NEW.beneficiary_name,NEW.destination_account_number,NEW.destination_bank_code,NEW.amount,NEW.currency,NEW.idempotency_key,NEW.request_hash) IS DISTINCT FROM (OLD.tenant_id,OLD.payment_id,OLD.customer_id,OLD.source_account_id,OLD.source_ledger_account_id,OLD.settlement_ledger_account_id,OLD.beneficiary_name,OLD.destination_account_number,OLD.destination_bank_code,OLD.amount,OLD.currency,OLD.idempotency_key,OLD.request_hash) THEN RAISE EXCEPTION 'External transfer command evidence is immutable'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_validate_external_transfer BEFORE INSERT OR UPDATE ON public.payment_external_transfers FOR EACH ROW EXECUTE FUNCTION public.validate_external_transfer();
    CREATE OR REPLACE FUNCTION public.validate_provider_attempt_outcome() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS','FINAL_SUCCESS','FINAL_FAILURE','REVERSED') AND NEW.submission_state='NOT_SENT' THEN RAISE EXCEPTION 'Submitted outcome requires submission evidence'; END IF;
      IF NEW.request_payload::text ~* '"(bvn|nin|pin|password|token|secret|credential)"[[:space:]]*:' OR NEW.response_payload::text ~* '"(bvn|nin|pin|password|token|secret|credential)"[[:space:]]*:' THEN RAISE EXCEPTION 'Sensitive provider evidence is prohibited'; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER trg_validate_provider_attempt_outcome BEFORE INSERT OR UPDATE ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.validate_provider_attempt_outcome();
    CREATE OR REPLACE FUNCTION public.prevent_unsafe_provider_change() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE prior record; BEGIN
      IF NEW.attempt_number>1 THEN SELECT outcome_class INTO prior FROM public.payment_attempts WHERE tenant_id=NEW.tenant_id AND payment_id=NEW.payment_id AND attempt_number=NEW.attempt_number-1;
        IF prior.outcome_class NOT IN('NOT_SENT','DEFINITE_PRE_SUBMISSION_FAILURE','FINAL_FAILURE') THEN RAISE EXCEPTION 'Previous provider outcome prohibits failover'; END IF;
      END IF; RETURN NEW;
    END $$;
    CREATE TRIGGER trg_prevent_unsafe_provider_change BEFORE INSERT ON public.payment_attempts FOR EACH ROW EXECUTE FUNCTION public.prevent_unsafe_provider_change();
    CREATE OR REPLACE FUNCTION public.record_external_transfer_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.payment_external_transfer_history(tenant_id,transfer_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;
    CREATE TRIGGER trg_external_transfer_status AFTER INSERT OR UPDATE OF status ON public.payment_external_transfers FOR EACH ROW EXECUTE FUNCTION public.record_external_transfer_status();
    CREATE OR REPLACE FUNCTION public.protect_external_transfer_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'External transfer history is immutable'; END $$;
    CREATE TRIGGER trg_protect_external_transfer_history BEFORE UPDATE OR DELETE ON public.payment_external_transfer_history FOR EACH ROW EXECUTE FUNCTION public.protect_external_transfer_history();

    ALTER TABLE public.payment_external_transfers ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_external_transfers FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_external_transfer_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_external_transfer_history FORCE ROW LEVEL SECURITY;
    CREATE POLICY external_transfer_tenant_policy ON public.payment_external_transfers USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY external_transfer_history_tenant_policy ON public.payment_external_transfer_history USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT,UPDATE ON public.payment_external_transfers TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT,INSERT ON public.payment_external_transfer_history TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("PAY-06 external-transfer controls are forward-only"),
  );
}
