import type { Knex } from "knex";

/**
 * Paystack's dedicated-account webhooks carry no tenant, only the customer
 * email we sent (stored as a SHA-256 reference). This definer function lets
 * the webhook handler find the open request across tenants without granting
 * the runtime role cross-tenant reads.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_va_requests_provider_customer
      ON public.virtual_account_provisioning_requests(provider_code, provider_customer_reference)
      WHERE status IN ('PENDING','SUBMITTED','MANUAL_REVIEW');
    CREATE OR REPLACE FUNCTION public.resolve_virtual_account_assignment(p_provider_code text, p_customer_reference text)
      RETURNS TABLE(tenant_id uuid, request_id uuid)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path TO 'public', 'pg_temp'
      AS $$
        SELECT r.tenant_id, r.id FROM public.virtual_account_provisioning_requests r
        WHERE r.provider_code = p_provider_code
          AND r.provider_customer_reference = p_customer_reference
          AND r.status IN ('PENDING','SUBMITTED','MANUAL_REVIEW')
        ORDER BY r.submitted_at DESC NULLS LAST
        LIMIT 1
      $$;
    REVOKE ALL ON FUNCTION public.resolve_virtual_account_assignment(text, text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.resolve_virtual_account_assignment(text, text) TO parc_payment_runtime;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("Virtual account assignment lookup is forward-only"),
  );
}
