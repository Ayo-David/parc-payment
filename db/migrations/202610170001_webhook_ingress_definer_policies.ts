import type { Knex } from "knex";

/**
 * The webhook ingress functions are SECURITY DEFINER so the runtime role
 * never gets cross-tenant rights, but FORCE ROW LEVEL SECURITY also binds
 * their owner. Deployed migrators are NOBYPASSRLS (unlike the local postgres
 * superuser), so a tenantless Paystack webhook failed the tenant policy on
 * insert, and the cross-tenant lookups saw no rows. These permissive policies
 * apply only to the role that owns those functions, which already owns the
 * tables; the runtime, worker and readonly roles are unaffected.
 */
const definerPolicies = [
  {
    fn: "public.record_verified_payment_webhook(text,text,text,jsonb,text,text,text,text)",
    table: "payment_webhooks",
    policy: "payment_webhooks_ingress_definer",
    command: "ALL",
  },
  {
    fn: "public.resolve_virtual_account_assignment(text,text)",
    table: "virtual_account_provisioning_requests",
    policy: "va_provisioning_assignment_definer",
    command: "SELECT",
  },
  {
    fn: "public.resolve_collection_account(text,text)",
    table: "financial_accounts",
    policy: "financial_accounts_collection_definer",
    command: "SELECT",
  },
  {
    fn: "public.resolve_collection_account(text,text)",
    table: "account_providers",
    policy: "account_providers_collection_definer",
    command: "SELECT",
  },
] as const;

export async function up(knex: Knex): Promise<void> {
  for (const { fn, table, policy, command } of definerPolicies) {
    const check = command === "ALL" ? " WITH CHECK (true)" : "";
    await knex.raw(`
      DO $$
      DECLARE owner_role text;
      BEGIN
        SELECT pg_get_userbyid(proowner) INTO STRICT owner_role
          FROM pg_proc WHERE oid = '${fn}'::regprocedure;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', '${policy}', '${table}');
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ${command} TO %I USING (true)${check}',
          '${policy}', '${table}', owner_role
        );
      END $$;
    `);
  }
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("Webhook ingress definer policies are forward-only"),
  );
}
