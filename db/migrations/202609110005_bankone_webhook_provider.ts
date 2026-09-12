import type { Knex } from "knex";

export const config = { transaction: false };

/** Approved PAYMENT-DB-10. This permits verified evidence only; no BankOne HTTP route is enabled. */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.record_verified_payment_webhook(p_provider_code text,p_event_reference text,p_event_type text,p_payload jsonb,p_payload_hash text,p_signature_hash text,p_signature_scheme text,p_credential_key_version text)
    RETURNS TABLE(webhook_id uuid,replayed boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE existing public.payment_webhooks%ROWTYPE; inserted_id uuid; BEGIN
      IF p_provider_code NOT IN ('PAYSTACK','WEMA','BANKONE') OR nullif(btrim(p_event_reference),'') IS NULL OR length(p_payload_hash)<>64 OR length(p_signature_hash)<>64 OR nullif(btrim(p_signature_scheme),'') IS NULL OR nullif(btrim(p_credential_key_version),'') IS NULL THEN RAISE EXCEPTION 'Invalid verified webhook evidence'; END IF;
      INSERT INTO public.payment_webhooks(provider_code,event_reference,event_type,payload,payload_hash,signature_verified,signature_hash,signature_scheme,credential_key_version) VALUES(p_provider_code,p_event_reference,p_event_type,p_payload,p_payload_hash,true,p_signature_hash,p_signature_scheme,p_credential_key_version) ON CONFLICT(provider_code,event_reference) DO NOTHING RETURNING id INTO inserted_id;
      IF inserted_id IS NOT NULL THEN RETURN QUERY SELECT inserted_id,false; RETURN; END IF;
      SELECT * INTO existing FROM public.payment_webhooks WHERE provider_code=p_provider_code AND event_reference=p_event_reference;
      IF existing.payload_hash<>p_payload_hash OR existing.signature_scheme<>p_signature_scheme OR existing.credential_key_version<>p_credential_key_version THEN RAISE EXCEPTION 'Webhook identity reused with different evidence'; END IF;
      RETURN QUERY SELECT existing.id,true;
    END $$;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("BankOne webhook provider allowance is forward-only"),
  );
}
