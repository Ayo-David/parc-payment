import type { Knex } from "knex";

/**
 * A provider's deposit webhook (Paystack charge.success on a dedicated
 * account) names only the receiving account number. This definer function
 * maps it to the tenant, funding account and Ledger wallet without granting
 * the runtime role cross-tenant reads.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.resolve_collection_account(p_provider_code text, p_account_number text)
      RETURNS TABLE(tenant_id uuid, financial_account_id uuid, ledger_account_id uuid)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path TO 'public', 'pg_temp'
      AS $$
        SELECT a.tenant_id, a.id, a.ledger_account_id
        FROM public.financial_accounts a
        JOIN public.account_providers p ON p.id = a.provider_id AND p.tenant_id = a.tenant_id
        WHERE p.provider_code = p_provider_code
          AND a.account_number = p_account_number
          AND a.account_type = 'VIRTUAL_BANK_ACCOUNT'
          AND a.status = 'ACTIVE'
          AND a.deleted_at IS NULL
          AND a.ledger_account_id IS NOT NULL
        LIMIT 1
      $$;
    REVOKE ALL ON FUNCTION public.resolve_collection_account(text, text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.resolve_collection_account(text, text) TO parc_payment_runtime;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(new Error("Collection account lookup is forward-only"));
}
