import type { Knex } from "knex";

/** Approved PAYMENT-DB-MONNIFY-02: bounded leased cross-tenant bill inquiry claims. */
export async function up(knex: Knex): Promise<void> {
  const existing = await knex.raw<{ rows: Array<{ exists: boolean }> }>(
    "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='claim_due_bill_inquiries') AS exists",
  );
  if (existing.rows[0]?.exists) return;
  await knex.raw(`
    CREATE FUNCTION public.claim_due_bill_inquiries(
      p_worker_id text,
      p_limit integer,
      p_lease_seconds integer DEFAULT 60
    ) RETURNS TABLE(
      attempt_id uuid,
      tenant_id uuid,
      bill_transaction_id uuid,
      provider_code varchar,
      provider_reference varchar,
      inquiry_attempts integer
    ) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    BEGIN
      IF nullif(btrim(p_worker_id),'') IS NULL OR p_limit<1 OR p_limit>100
        OR p_lease_seconds<10 OR p_lease_seconds>600 THEN
        RAISE EXCEPTION 'Invalid bill inquiry claim';
      END IF;
      RETURN QUERY
      WITH due AS (
        SELECT a.id
        FROM public.bill_transaction_attempts a
        WHERE a.outcome_class IN ('ACKNOWLEDGED_PENDING','AMBIGUOUS')
          AND a.next_inquiry_at <= now()
          AND (a.inquiry_lease_expires_at IS NULL OR a.inquiry_lease_expires_at < now())
        ORDER BY a.next_inquiry_at, a.id
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
      ), claimed AS (
        UPDATE public.bill_transaction_attempts a SET
          inquiry_lease_expires_at = now()+make_interval(secs=>p_lease_seconds),
          inquiry_attempts = a.inquiry_attempts+1
        FROM due WHERE a.id=due.id
        RETURNING a.*
      )
      SELECT c.id,c.tenant_id,c.bill_transaction_id,bp.provider_code,
        COALESCE(c.provider_reference, 'PARC-'||c.bill_transaction_id::text)::varchar,
        c.inquiry_attempts
      FROM claimed c
      JOIN public.bill_transactions b
        ON b.tenant_id=c.tenant_id AND b.id=c.bill_transaction_id
      JOIN public.bill_providers bp
        ON bp.tenant_id=b.tenant_id AND bp.id=b.provider_id;
    END $$;
    REVOKE ALL ON FUNCTION public.claim_due_bill_inquiries(text,integer,integer) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.claim_due_bill_inquiries(text,integer,integer)
      TO parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(new Error("Bill inquiry claims are forward-only"));
}
