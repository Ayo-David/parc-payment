import type { Knex } from "knex";

/**
 * Customer bank transfers: a verified name enquiry (the provider's resolved
 * account name and transfer recipient) and an expiring quote that fixes the
 * fee. A quote pays for at most one transfer, and the transfer carries the
 * fee so the Ledger hold and capture cover amount plus fee.
 */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_transfer_quotes")) return;
  await knex.raw(`
    CREATE TABLE public.payment_transfer_name_enquiries(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, customer_id uuid NOT NULL,
      bank_code varchar(20) NOT NULL, account_number varchar(20) NOT NULL, account_name varchar(200) NOT NULL,
      provider_code varchar(50) NOT NULL, recipient_code varchar(100) NOT NULL, routing_decision_id uuid NOT NULL,
      idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id),
      FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id),
      CHECK(expires_at>created_at)
    );
    CREATE TABLE public.payment_transfer_quotes(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, customer_id uuid NOT NULL,
      enquiry_id uuid NOT NULL, amount bigint NOT NULL CHECK(amount>0), fee_amount bigint NOT NULL CHECK(fee_amount>=0),
      total_debit bigint NOT NULL CHECK(total_debit=amount+fee_amount), currency char(3) NOT NULL CHECK(currency='NGN'),
      narration varchar(100) NOT NULL, idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id),
      FOREIGN KEY(tenant_id,enquiry_id) REFERENCES public.payment_transfer_name_enquiries(tenant_id,id),
      CHECK(expires_at>created_at)
    );
    ALTER TABLE public.payment_external_transfers
      ADD COLUMN quote_id uuid, ADD COLUMN fee_amount bigint NOT NULL DEFAULT 0 CHECK(fee_amount>=0),
      ADD COLUMN fee_ledger_account_id uuid,
      ADD CONSTRAINT uq_external_quote UNIQUE(tenant_id,quote_id),
      ADD CONSTRAINT fk_external_quote_tenant FOREIGN KEY(tenant_id,quote_id) REFERENCES public.payment_transfer_quotes(tenant_id,id),
      ADD CONSTRAINT chk_external_fee_account CHECK(fee_amount=0 OR fee_ledger_account_id IS NOT NULL);

    CREATE OR REPLACE FUNCTION public.protect_transfer_quote_evidence() RETURNS trigger
      LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
      AS $$ BEGIN RAISE EXCEPTION 'Transfer enquiries and quotes are immutable'; END $$;
    CREATE TRIGGER trg_protect_transfer_enquiry BEFORE UPDATE OR DELETE ON public.payment_transfer_name_enquiries FOR EACH ROW EXECUTE FUNCTION public.protect_transfer_quote_evidence();
    CREATE TRIGGER trg_protect_transfer_quote BEFORE UPDATE OR DELETE ON public.payment_transfer_quotes FOR EACH ROW EXECUTE FUNCTION public.protect_transfer_quote_evidence();

    ALTER TABLE public.payment_transfer_name_enquiries ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_transfer_name_enquiries FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.payment_transfer_quotes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.payment_transfer_quotes FORCE ROW LEVEL SECURITY;
    CREATE POLICY transfer_enquiry_tenant_policy ON public.payment_transfer_name_enquiries USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY transfer_quote_tenant_policy ON public.payment_transfer_quotes USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT ON public.payment_transfer_name_enquiries,public.payment_transfer_quotes TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(new Error("Bank transfer quotes are forward-only"));
}
