import type { Knex } from "knex";

/**
 * A provider's transfer webhook (Paystack transfer.success / failed /
 * reversed) carries only our transfer reference. This definer function maps
 * the transfer id inside it to its tenant, and only when that transfer was
 * submitted through the named provider, without granting the runtime role
 * cross-tenant reads. As in 202610170001, FORCE ROW LEVEL SECURITY binds the
 * function owner too, so it gets permissive SELECT policies of its own.
 */
const fn = "public.resolve_external_transfer(text,uuid)";
const definerPolicies = [
  {
    table: "payment_external_transfers",
    policy: "external_transfers_resolve_definer",
  },
  { table: "payment_attempts", policy: "payment_attempts_resolve_definer" },
] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.resolve_external_transfer(p_provider_code text, p_transfer_id uuid)
      RETURNS TABLE(tenant_id uuid, external_transfer_id uuid)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path TO 'public', 'pg_temp'
      AS $$
        SELECT t.tenant_id, t.id
        FROM public.payment_external_transfers t
        JOIN public.payment_attempts a ON a.id = t.active_attempt_id AND a.tenant_id = t.tenant_id
        WHERE t.id = p_transfer_id
          AND a.provider_code = p_provider_code
        LIMIT 1
      $$;
    REVOKE ALL ON FUNCTION ${fn} FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION ${fn} TO parc_payment_runtime;
  `);
  for (const { table, policy } of definerPolicies)
    await knex.raw(`
      DO $$
      DECLARE owner_role text;
      BEGIN
        SELECT pg_get_userbyid(proowner) INTO STRICT owner_role
          FROM pg_proc WHERE oid = '${fn}'::regprocedure;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', '${policy}', '${table}');
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO %I USING (true)',
          '${policy}', '${table}', owner_role
        );
      END $$;
    `);
}

export function down(): Promise<never> {
  return Promise.reject(new Error("External transfer lookup is forward-only"));
}
