import type { Knex } from "knex";
export const config = { transaction: false };

/** Approved PAYMENT-DB-01 through PAYMENT-DB-05. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_provider_routing_decisions")) return;
  await knex.raw(`
    DO $roles$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_runtime') THEN CREATE ROLE parc_payment_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_worker') THEN CREATE ROLE parc_payment_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_readonly') THEN CREATE ROLE parc_payment_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
    END $roles$;

    DO $money$ DECLARE item text; parts text[]; BEGIN
      FOREACH item IN ARRAY ARRAY[
        'bill_products.amount','bill_products.min_amount','bill_products.max_amount',
        'bill_transactions.amount','bill_transactions.fee_amount','payment_fees.amount',
        'payment_reconciliation_records.provider_amount','payment_reconciliation_records.internal_amount',
        'payment_reconciliation_records.provider_fee_amount','payment_reconciliation_records.expected_net_amount',
        'payment_reconciliation_records.actual_settlement_amount','payment_reconciliation_records.difference_amount',
        'payment_reversals.amount','payment_transactions.amount','platform_revenue_adjustments.amount',
        'platform_revenue_events.basis_amount','platform_revenue_events.fixed_amount',
        'platform_revenue_events.gross_revenue_amount','platform_revenue_events.fee_amount',
        'platform_revenue_events.tax_amount','platform_revenue_events.net_revenue_amount',
        'platform_revenue_settlement_items.amount','platform_revenue_settlements.gross_revenue_amount',
        'platform_revenue_settlements.adjustment_amount','platform_revenue_settlements.settlement_fee_amount',
        'platform_revenue_settlements.tax_amount','platform_revenue_settlements.net_settlement_amount',
        'platform_revenue_shares.share_basis_amount','platform_revenue_shares.parc_share_amount',
        'platform_revenue_shares.tenant_retained_amount','platform_revenue_shares.provider_share_amount',
        'platform_revenue_shares.partner_share_amount'
      ] LOOP
        parts:=string_to_array(item,'.');
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE bigint USING CASE WHEN %I IS NULL THEN NULL ELSE round(%I*100)::bigint END',parts[1],parts[2],parts[2],parts[2]);
      END LOOP;
    END $money$;

    CREATE TABLE public.payment_provider_routing_decisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      capability varchar(50) NOT NULL, currency char(3) NOT NULL,
      provider_code varchar(50) NOT NULL, selection_id uuid NOT NULL,
      selection_version integer NOT NULL CHECK(selection_version>0),
      routing_reason varchar(40) NOT NULL CHECK(routing_reason IN ('PREFERRED','CIRCUIT_OPEN','PRE_SUBMISSION_FAILURE')),
      request_hash char(64) NOT NULL,
      correlation_id uuid NOT NULL, idempotency_key varchar(255) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_routing_currency CHECK(currency ~ '^[A-Z]{3}$'),
      CONSTRAINT uq_payment_routing_idempotency UNIQUE(tenant_id,idempotency_key),
      CONSTRAINT uq_payment_routing_tenant_id UNIQUE(tenant_id,id)
    );
    ALTER TABLE public.payment_attempts
      ADD COLUMN routing_decision_id uuid,
      ADD COLUMN request_hash char(64),
      ADD COLUMN submission_state varchar(20) NOT NULL DEFAULT 'NOT_SENT' CHECK(submission_state IN ('NOT_SENT','SUBMITTED','ACKNOWLEDGED')),
      ADD COLUMN outcome_certainty varchar(20) NOT NULL DEFAULT 'KNOWN' CHECK(outcome_certainty IN ('KNOWN','AMBIGUOUS'));

    ALTER TABLE public.payment_transactions ADD CONSTRAINT uq_payment_transaction_tenant_id UNIQUE(tenant_id,id);
    ALTER TABLE public.payment_attempts DROP CONSTRAINT fk_payment_attempt_payment;
    ALTER TABLE public.payment_attempts ADD CONSTRAINT fk_payment_attempt_payment_tenant FOREIGN KEY(tenant_id,payment_id) REFERENCES public.payment_transactions(tenant_id,id);
    ALTER TABLE public.payment_attempts ADD CONSTRAINT fk_payment_attempt_routing_tenant FOREIGN KEY(tenant_id,routing_decision_id) REFERENCES public.payment_provider_routing_decisions(tenant_id,id);

    CREATE OR REPLACE FUNCTION public.prevent_payment_routing_decision_change() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Provider routing decisions are immutable'; END $$;
    CREATE TRIGGER trg_immutable_payment_routing_decision BEFORE UPDATE OR DELETE ON public.payment_provider_routing_decisions FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_routing_decision_change();

    ALTER TABLE public.payment_provider_routing_decisions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY payment_provider_routing_tenant_policy ON public.payment_provider_routing_decisions USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    DO $rls$ DECLARE row record; BEGIN FOR row IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='tenant_id' WHERE n.nspname='public' AND c.relkind='r' LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',row.relname); EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',row.relname); END LOOP; END $rls$;
    GRANT USAGE ON SCHEMA public TO parc_payment_runtime,parc_payment_worker,parc_payment_readonly;
    GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO parc_payment_readonly;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO parc_payment_runtime,parc_payment_worker;
  `);
}
export function down(): Promise<never> {
  return Promise.reject(new Error("PAY-01 foundations are forward-only"));
}
