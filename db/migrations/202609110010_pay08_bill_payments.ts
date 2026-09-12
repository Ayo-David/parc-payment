import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-41 through PAYMENT-DB-53. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("bill_payment_quotes")) return;
  await knex.raw(`
    ALTER TYPE public.payment_type_enum ADD VALUE IF NOT EXISTS 'BILL_PAYMENT';
    ALTER TABLE public.bill_providers ADD CONSTRAINT uq_bill_provider_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.bill_products ADD COLUMN category_id uuid, ADD COLUMN catalogue_version integer NOT NULL DEFAULT 1 CHECK(catalogue_version>0), ADD COLUMN published_at timestamptz, ADD COLUMN effective_from timestamptz NOT NULL DEFAULT now(), ADD COLUMN effective_to timestamptz, ADD COLUMN denomination_type varchar(20) NOT NULL DEFAULT 'VARIABLE' CHECK(denomination_type IN('FIXED','VARIABLE')), ADD COLUMN fee_amount bigint NOT NULL DEFAULT 0 CHECK(fee_amount>=0), ADD COLUMN tax_amount bigint NOT NULL DEFAULT 0 CHECK(tax_amount>=0), ADD COLUMN cashback_amount bigint NOT NULL DEFAULT 0 CHECK(cashback_amount>=0);
    UPDATE public.bill_products p SET category_id=bp.category_id FROM public.bill_providers bp WHERE bp.tenant_id=p.tenant_id AND bp.id=p.provider_id;
    ALTER TABLE public.bill_products ALTER COLUMN category_id SET NOT NULL;
    ALTER TABLE public.bill_products ADD CONSTRAINT uq_bill_product_tenant_id UNIQUE(tenant_id,id), ADD CONSTRAINT fk_bill_product_provider_tenant FOREIGN KEY(tenant_id,provider_id) REFERENCES public.bill_providers(tenant_id,id), ADD CONSTRAINT fk_bill_product_category FOREIGN KEY(category_id) REFERENCES public.bill_categories(id), ADD CONSTRAINT chk_bill_product_ngn CHECK(currency='NGN'), ADD CONSTRAINT chk_bill_product_denomination CHECK((denomination_type='FIXED' AND amount IS NOT NULL AND min_amount IS NULL AND max_amount IS NULL) OR (denomination_type='VARIABLE' AND amount IS NULL AND min_amount IS NOT NULL AND max_amount IS NOT NULL));
    ALTER TABLE public.bill_products DROP CONSTRAINT uq_bill_product;
    ALTER TABLE public.bill_products ADD CONSTRAINT uq_bill_product_version UNIQUE(tenant_id,provider_id,product_code,catalogue_version);

    CREATE TABLE public.bill_customer_validations(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, customer_id uuid NOT NULL,
      product_id uuid NOT NULL, customer_identifier varchar(200) NOT NULL, normalized_customer_name varchar(200),
      provider_code varchar(50) NOT NULL, provider_reference varchar(200), routing_decision_id uuid NOT NULL,
      idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL, evidence_hash char(64) NOT NULL,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id),
      FOREIGN KEY(tenant_id,product_id) REFERENCES public.bill_products(tenant_id,id),
      FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id),
      CHECK(expires_at>created_at)
    );
    CREATE TABLE public.bill_payment_quotes(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, customer_id uuid NOT NULL,
      product_id uuid NOT NULL, validation_id uuid, amount bigint NOT NULL CHECK(amount>0), fee_amount bigint NOT NULL CHECK(fee_amount>=0), tax_amount bigint NOT NULL CHECK(tax_amount>=0), cashback_amount bigint NOT NULL CHECK(cashback_amount>=0), total_debit bigint NOT NULL CHECK(total_debit=amount+fee_amount+tax_amount), currency char(3) NOT NULL CHECK(currency='NGN'),
      catalogue_version integer NOT NULL CHECK(catalogue_version>0), provider_code varchar(50) NOT NULL, routing_decision_id uuid NOT NULL,
      idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id),
      FOREIGN KEY(tenant_id,product_id) REFERENCES public.bill_products(tenant_id,id),
      FOREIGN KEY(tenant_id,validation_id) REFERENCES public.bill_customer_validations(tenant_id,id),
      FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id), CHECK(expires_at>created_at)
    );

    ALTER TABLE public.bill_transactions ADD COLUMN quote_id uuid, ADD COLUMN idempotency_key varchar(255), ADD COLUMN request_hash char(64), ADD COLUMN routing_decision_id uuid, ADD COLUMN provider_selection_version integer, ADD COLUMN ledger_hold_id uuid, ADD COLUMN ledger_transaction_id uuid, ADD COLUMN ledger_reversal_transaction_id uuid, ADD COLUMN source_ledger_account_id uuid, ADD COLUMN provider_payable_ledger_account_id uuid, ADD COLUMN tax_ledger_account_id uuid, ADD COLUMN revenue_ledger_account_id uuid, ADD COLUMN cashback_ledger_account_id uuid, ADD COLUMN tax_amount bigint NOT NULL DEFAULT 0 CHECK(tax_amount>=0), ADD COLUMN cashback_amount bigint NOT NULL DEFAULT 0 CHECK(cashback_amount>=0), ADD COLUMN total_debit bigint, ADD COLUMN outcome_class varchar(30) NOT NULL DEFAULT 'NOT_SUBMITTED' CHECK(outcome_class IN('NOT_SUBMITTED','ACKNOWLEDGED_PENDING','AMBIGUOUS','FINAL_SUCCESS','FINAL_FAILURE','REVERSED')), ADD COLUMN next_inquiry_at timestamptz, ADD COLUMN financial_record_retain_until timestamptz NOT NULL DEFAULT(now()+interval '7 years');
    ALTER TABLE public.bill_transactions ADD CONSTRAINT uq_bill_transaction_tenant_id UNIQUE(tenant_id,id), ADD CONSTRAINT uq_bill_transaction_idempotency UNIQUE(tenant_id,idempotency_key), ADD CONSTRAINT uq_bill_transaction_quote UNIQUE(tenant_id,quote_id), ADD CONSTRAINT fk_bill_transaction_source_tenant FOREIGN KEY(tenant_id,source_account_id) REFERENCES public.financial_accounts(tenant_id,id), ADD CONSTRAINT fk_bill_transaction_product_tenant FOREIGN KEY(tenant_id,product_id) REFERENCES public.bill_products(tenant_id,id), ADD CONSTRAINT fk_bill_transaction_provider_tenant FOREIGN KEY(tenant_id,provider_id) REFERENCES public.bill_providers(tenant_id,id), ADD CONSTRAINT fk_bill_transaction_quote_tenant FOREIGN KEY(tenant_id,quote_id) REFERENCES public.bill_payment_quotes(tenant_id,id), ADD CONSTRAINT fk_bill_transaction_routing_tenant FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id), ADD CONSTRAINT chk_bill_transaction_ngn CHECK(currency='NGN'), ADD CONSTRAINT chk_bill_total CHECK(total_debit=amount+fee_amount+tax_amount);
    ALTER TABLE public.bill_transaction_attempts ADD COLUMN request_hash char(64), ADD COLUMN submission_state varchar(20) NOT NULL DEFAULT 'NOT_SENT' CHECK(submission_state IN('NOT_SENT','SUBMITTED','ACKNOWLEDGED')), ADD COLUMN outcome_class varchar(30) NOT NULL DEFAULT 'NOT_SUBMITTED' CHECK(outcome_class IN('NOT_SUBMITTED','ACKNOWLEDGED_PENDING','AMBIGUOUS','FINAL_SUCCESS','FINAL_FAILURE','REVERSED')), ADD COLUMN next_inquiry_at timestamptz, ADD COLUMN inquiry_attempts integer NOT NULL DEFAULT 0 CHECK(inquiry_attempts>=0), ADD COLUMN inquiry_lease_expires_at timestamptz, ADD COLUMN evidence_hash char(64), ADD COLUMN raw_evidence_expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days');
    ALTER TABLE public.bill_transaction_attempts DROP CONSTRAINT fk_bill_attempt_transaction;
    ALTER TABLE public.bill_transaction_attempts ADD CONSTRAINT fk_bill_attempt_transaction_tenant FOREIGN KEY(tenant_id,bill_transaction_id) REFERENCES public.bill_transactions(tenant_id,id);
    ALTER TABLE public.bill_provider_transactions DROP CONSTRAINT fk_bill_provider_transaction;
    ALTER TABLE public.bill_provider_transactions ADD CONSTRAINT fk_bill_provider_transaction_tenant FOREIGN KEY(tenant_id,bill_transaction_id) REFERENCES public.bill_transactions(tenant_id,id), ADD COLUMN evidence_hash char(64), ADD COLUMN raw_evidence_expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days');
    ALTER TABLE public.bill_webhooks ADD COLUMN payload_hash char(64), ADD COLUMN signature_scheme varchar(50), ADD COLUMN signing_key_version varchar(100), ADD COLUMN raw_evidence_expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days');

    CREATE TABLE public.bill_transaction_status_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,bill_transaction_id uuid NOT NULL,previous_status public.bill_transaction_status_enum,new_status public.bill_transaction_status_enum NOT NULL,reason text,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(tenant_id,bill_transaction_id) REFERENCES public.bill_transactions(tenant_id,id));
    CREATE OR REPLACE FUNCTION public.validate_bill_transaction() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.customer_id,NEW.source_account_id,NEW.product_id,NEW.provider_id,NEW.amount,NEW.fee_amount,NEW.tax_amount,NEW.cashback_amount,NEW.currency,NEW.idempotency_key,NEW.request_hash,NEW.routing_decision_id,NEW.quote_id) IS DISTINCT FROM (OLD.tenant_id,OLD.customer_id,OLD.source_account_id,OLD.product_id,OLD.provider_id,OLD.amount,OLD.fee_amount,OLD.tax_amount,OLD.cashback_amount,OLD.currency,OLD.idempotency_key,OLD.request_hash,OLD.routing_decision_id,OLD.quote_id) THEN RAISE EXCEPTION 'Bill command evidence is immutable'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER trg_validate_bill_transaction BEFORE UPDATE ON public.bill_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_bill_transaction();
    CREATE OR REPLACE FUNCTION public.record_bill_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.bill_transaction_status_history(tenant_id,bill_transaction_id,previous_status,new_status,reason) VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason); END IF; RETURN NEW; END $$;
    CREATE TRIGGER trg_record_bill_status AFTER INSERT OR UPDATE OF status ON public.bill_transactions FOR EACH ROW EXECUTE FUNCTION public.record_bill_status();
    CREATE OR REPLACE FUNCTION public.protect_bill_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Financial evidence is immutable'; END $$;
    CREATE TRIGGER trg_protect_bill_history BEFORE UPDATE OR DELETE ON public.bill_transaction_status_history FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();
    CREATE TRIGGER trg_protect_bill_quote BEFORE UPDATE OR DELETE ON public.bill_payment_quotes FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();
    CREATE TRIGGER trg_protect_bill_validation BEFORE UPDATE OR DELETE ON public.bill_customer_validations FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();
    CREATE TRIGGER trg_protect_published_bill_product BEFORE UPDATE OR DELETE ON public.bill_products FOR EACH ROW WHEN(OLD.published_at IS NOT NULL) EXECUTE FUNCTION public.protect_bill_immutable();
    CREATE INDEX idx_bill_inquiry_due ON public.bill_transaction_attempts(next_inquiry_at,inquiry_lease_expires_at) WHERE outcome_class IN('ACKNOWLEDGED_PENDING','AMBIGUOUS');
    CREATE UNIQUE INDEX uq_bill_provider_reference ON public.bill_transaction_attempts(provider_reference) WHERE provider_reference IS NOT NULL;

    ALTER TABLE public.bill_customer_validations ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_customer_validations FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.bill_payment_quotes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_payment_quotes FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.bill_transaction_status_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_transaction_status_history FORCE ROW LEVEL SECURITY;
    CREATE POLICY bill_validation_tenant_policy ON public.bill_customer_validations USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY bill_quote_tenant_policy ON public.bill_payment_quotes USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY bill_status_history_tenant_policy ON public.bill_transaction_status_history USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT ON public.bill_customer_validations,public.bill_payment_quotes,public.bill_transaction_status_history TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("PAY-08 bill-payment controls are forward-only"),
  );
}
