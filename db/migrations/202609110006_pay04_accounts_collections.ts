import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-11 through PAYMENT-DB-17. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("virtual_account_provisioning_requests"))
    return;
  await knex.raw(`
    ALTER TABLE public.account_providers ADD CONSTRAINT uq_account_provider_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.financial_accounts ADD CONSTRAINT uq_financial_account_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.financial_accounts DROP CONSTRAINT fk_account_provider;
    ALTER TABLE public.financial_accounts ADD CONSTRAINT fk_account_provider_tenant FOREIGN KEY(tenant_id,provider_id) REFERENCES public.account_providers(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.account_provider_accounts DROP CONSTRAINT fk_provider_account, DROP CONSTRAINT fk_provider_account_provider;
    ALTER TABLE public.account_provider_accounts ADD CONSTRAINT fk_provider_account_tenant FOREIGN KEY(tenant_id,account_id) REFERENCES public.financial_accounts(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.account_provider_accounts ADD CONSTRAINT fk_provider_account_provider_tenant FOREIGN KEY(tenant_id,provider_id) REFERENCES public.account_providers(tenant_id,id) ON DELETE RESTRICT;
    ALTER TABLE public.account_status_history DROP CONSTRAINT fk_account_status_history_account;
    ALTER TABLE public.account_status_history ADD CONSTRAINT fk_account_status_history_account_tenant FOREIGN KEY(tenant_id,account_id) REFERENCES public.financial_accounts(tenant_id,id) ON DELETE RESTRICT;

    CREATE TABLE public.virtual_account_provisioning_requests(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      customer_id uuid NOT NULL, financial_account_id uuid NOT NULL,
      routing_decision_id uuid NOT NULL, provider_code varchar(50) NOT NULL,
      currency char(3) NOT NULL, idempotency_key varchar(255) NOT NULL,
      request_hash char(64) NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','SUBMITTED','ACTIVE','FAILED','MANUAL_REVIEW')),
      provider_customer_reference varchar(200), provider_account_reference varchar(200),
      failure_code varchar(100), failure_reason text, submitted_at timestamptz,
      completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_va_currency CHECK(currency ~ '^[A-Z]{3}$'),
      CONSTRAINT uq_va_idempotency UNIQUE(tenant_id,idempotency_key),
      CONSTRAINT uq_va_tenant_id UNIQUE(tenant_id,id),
      CONSTRAINT fk_va_account_tenant FOREIGN KEY(tenant_id,financial_account_id) REFERENCES public.financial_accounts(tenant_id,id),
      CONSTRAINT fk_va_routing_tenant FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id)
    );
    CREATE UNIQUE INDEX uq_active_customer_currency_account ON public.financial_accounts(tenant_id,customer_id,currency) WHERE account_type='VIRTUAL_BANK_ACCOUNT' AND deleted_at IS NULL AND status IN('PENDING','ACTIVE','SUSPENDED','FROZEN');
    CREATE INDEX idx_va_provisioning_recovery ON public.virtual_account_provisioning_requests(status,created_at) WHERE status IN('PENDING','SUBMITTED','MANUAL_REVIEW');

    CREATE TABLE public.payment_collections(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      financial_account_id uuid NOT NULL, payment_id uuid NOT NULL, customer_id uuid NOT NULL,
      webhook_id uuid, provider_code varchar(50) NOT NULL,
      provider_reference varchar(200) NOT NULL, amount bigint NOT NULL CHECK(amount>0),
      currency char(3) NOT NULL, payload_hash char(64) NOT NULL,
      status varchar(30) NOT NULL DEFAULT 'VERIFIED' CHECK(status IN('VERIFIED','POSTING','POSTED','FAILED','MANUAL_REVIEW')),
      debit_ledger_account_id uuid NOT NULL, credit_ledger_account_id uuid NOT NULL,
      ledger_idempotency_key varchar(255) NOT NULL, ledger_transaction_id uuid,
      failure_code varchar(100), failure_reason text, provider_paid_at timestamptz,
      posted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_collection_currency CHECK(currency ~ '^[A-Z]{3}$'),
      CONSTRAINT uq_collection_provider_reference UNIQUE(provider_code,provider_reference),
      CONSTRAINT uq_collection_webhook UNIQUE(webhook_id),
      CONSTRAINT uq_collection_ledger_idempotency UNIQUE(tenant_id,ledger_idempotency_key),
      CONSTRAINT uq_collection_tenant_id UNIQUE(tenant_id,id),
      CONSTRAINT fk_collection_account_tenant FOREIGN KEY(tenant_id,financial_account_id) REFERENCES public.financial_accounts(tenant_id,id),
      CONSTRAINT fk_collection_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id),
      CONSTRAINT fk_collection_webhook FOREIGN KEY(webhook_id) REFERENCES public.payment_webhooks(id)
    );
    CREATE INDEX idx_collection_posting_recovery ON public.payment_collections(status,created_at) WHERE status IN('VERIFIED','POSTING','MANUAL_REVIEW');
    ALTER TABLE public.payment_outbox_events ADD CONSTRAINT uq_payment_outbox_tenant_idempotency UNIQUE(tenant_id,idempotency_key);

    CREATE TABLE public.payment_collection_status_history(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      collection_id uuid NOT NULL, previous_status varchar(30), new_status varchar(30) NOT NULL,
      reason text, created_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY(tenant_id,collection_id) REFERENCES public.payment_collections(tenant_id,id)
    );
    CREATE OR REPLACE FUNCTION public.record_collection_status() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.payment_collection_status_history(tenant_id,collection_id,previous_status,new_status,reason)
        VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.status END,NEW.status,NEW.failure_reason);
      END IF; RETURN NEW;
    END $$;
    CREATE TRIGGER trg_collection_status AFTER INSERT OR UPDATE OF status ON public.payment_collections FOR EACH ROW EXECUTE FUNCTION public.record_collection_status();
    CREATE OR REPLACE FUNCTION public.protect_collection_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Collection status history is immutable'; END $$;
    CREATE TRIGGER trg_protect_collection_history BEFORE UPDATE OR DELETE ON public.payment_collection_status_history FOR EACH ROW EXECUTE FUNCTION public.protect_collection_history();

    ALTER TABLE public.virtual_account_provisioning_requests ENABLE ROW LEVEL SECURITY; ALTER TABLE public.virtual_account_provisioning_requests FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_collections FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_collection_status_history ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_collection_status_history FORCE ROW LEVEL SECURITY;
    CREATE POLICY va_provisioning_tenant_policy ON public.virtual_account_provisioning_requests USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY collections_tenant_policy ON public.payment_collections USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY collection_history_tenant_policy ON public.payment_collection_status_history USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT,UPDATE ON public.virtual_account_provisioning_requests,public.payment_collections TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT,INSERT ON public.payment_collection_status_history TO parc_payment_runtime,parc_payment_worker;
  `);
}

/** Rejects rollback because PAY-04 account and collection controls are forward-only. */
export function down(): Promise<never> {
  return Promise.reject(
    new Error("PAY-04 account and collection controls are forward-only"),
  );
}
