import type { Knex } from "knex";
export const config = { transaction: false };
/** Approved PAYMENT-DB-54 through PAYMENT-DB-60. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_service_payouts")) return;
  await knex.raw(`
CREATE TABLE public.payment_service_payouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,source_service varchar(100) NOT NULL,
 source_resource_id uuid NOT NULL,customer_id uuid NOT NULL,ledger_transaction_id uuid NOT NULL,destination_reference varchar(255) NOT NULL,
 amount bigint NOT NULL CHECK(amount>0),currency char(3) NOT NULL CHECK(currency='NGN'),narration varchar(140) NOT NULL,
 status varchar(30) NOT NULL DEFAULT 'CREATED' CHECK(status IN('CREATED','SUBMITTING','PENDING','SUCCEEDED','FAILED','REVERSED','MANUAL_REVIEW')),
 routing_decision_id uuid,active_attempt_id uuid,idempotency_key varchar(255) NOT NULL,request_hash char(64) NOT NULL,correlation_id uuid NOT NULL,
 next_inquiry_at timestamptz,failure_code varchar(100),failure_reason text,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 retention_until date NOT NULL DEFAULT(current_date+2557),legal_hold boolean NOT NULL DEFAULT false,UNIQUE(tenant_id,id),UNIQUE(tenant_id,source_service,source_resource_id),UNIQUE(tenant_id,idempotency_key));
CREATE TABLE public.payment_service_payout_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,payout_id uuid NOT NULL,attempt_number integer NOT NULL CHECK(attempt_number>0),
 provider_code varchar(100) NOT NULL,provider_reference varchar(255),submission_state varchar(30) NOT NULL,outcome_certainty varchar(20) NOT NULL CHECK(outcome_certainty IN('CERTAIN','AMBIGUOUS')),
 request_hash char(64) NOT NULL,evidence_hash char(64),next_inquiry_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 retention_until date NOT NULL DEFAULT(current_date+2557),legal_hold boolean NOT NULL DEFAULT false,UNIQUE(tenant_id,id),UNIQUE(tenant_id,payout_id,attempt_number),
 FOREIGN KEY(tenant_id,payout_id) REFERENCES public.payment_service_payouts(tenant_id,id));
CREATE UNIQUE INDEX uq_service_payout_provider_success ON public.payment_service_payout_attempts(tenant_id,payout_id) WHERE submission_state='SUCCESS';
CREATE INDEX idx_service_payout_inquiry ON public.payment_service_payouts(status,next_inquiry_at) WHERE status IN('PENDING','MANUAL_REVIEW');
ALTER TABLE public.payment_service_payouts ENABLE ROW LEVEL SECURITY;ALTER TABLE public.payment_service_payouts FORCE ROW LEVEL SECURITY;ALTER TABLE public.payment_service_payout_attempts ENABLE ROW LEVEL SECURITY;ALTER TABLE public.payment_service_payout_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY service_payout_tenant_policy ON public.payment_service_payouts USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
CREATE POLICY service_payout_attempt_tenant_policy ON public.payment_service_payout_attempts USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
GRANT SELECT,INSERT,UPDATE ON public.payment_service_payouts,public.payment_service_payout_attempts TO parc_payment_runtime,parc_payment_worker;GRANT SELECT ON public.payment_service_payouts,public.payment_service_payout_attempts TO parc_payment_readonly;
`);
}
export function down(): Promise<never> {
  return Promise.reject(new Error("LN-05 service payouts are forward-only"));
}
