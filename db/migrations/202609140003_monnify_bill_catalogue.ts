import type { Knex } from "knex";

/** Approved PAYMENT-DB-MONNIFY-03 through PAYMENT-DB-MONNIFY-08. */
export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable("bill_catalogue_imports");
  if (exists) return;
  await knex.raw(`
    CREATE TABLE public.bill_catalogue_imports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
      provider_code varchar(50) NOT NULL CHECK(provider_code='MONNIFY'),
      status varchar(20) NOT NULL CHECK(status IN('IMPORTING','DRAFT','FAILED','PUBLISHED')),
      idempotency_key varchar(255) NOT NULL, request_hash char(64) NOT NULL,
      source_hash char(64), category_count integer NOT NULL DEFAULT 0 CHECK(category_count>=0),
      product_count integer NOT NULL DEFAULT 0 CHECK(product_count>=0),
      failure_code varchar(100), started_by uuid NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz, raw_evidence_expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days'),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,id)
    );
    CREATE TABLE public.bill_catalogue_import_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, import_id uuid NOT NULL,
      category_code varchar(100) NOT NULL, category_name varchar(200) NOT NULL,
      category varchar(30) NOT NULL CHECK(category IN('AIRTIME','DATA','ELECTRICITY','CABLE_TV','INTERNET')),
      biller_code varchar(100) NOT NULL, biller_name varchar(200) NOT NULL,
      product_code varchar(100) NOT NULL, product_name varchar(200) NOT NULL, description text,
      denomination_type varchar(20) NOT NULL CHECK(denomination_type IN('FIXED','VARIABLE')),
      amount bigint, min_amount bigint, max_amount bigint, currency char(3) NOT NULL CHECK(currency='NGN'),
      source_payload jsonb NOT NULL, evidence_hash char(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_bill_catalogue_item_import FOREIGN KEY(tenant_id,import_id)
        REFERENCES public.bill_catalogue_imports(tenant_id,id),
      CONSTRAINT chk_bill_catalogue_item_amounts CHECK(
        (denomination_type='FIXED' AND amount>0 AND min_amount IS NULL AND max_amount IS NULL) OR
        (denomination_type='VARIABLE' AND amount IS NULL AND min_amount>0 AND max_amount>=min_amount)
      ),
      UNIQUE(tenant_id,import_id,product_code), UNIQUE(tenant_id,id)
    );
    CREATE TABLE public.bill_catalogue_publications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, import_id uuid NOT NULL,
      provider_code varchar(50) NOT NULL CHECK(provider_code='MONNIFY'), catalogue_version integer NOT NULL CHECK(catalogue_version>0),
      approval_id uuid NOT NULL, approval_payload_hash char(64) NOT NULL, published_by uuid NOT NULL,
      idempotency_key varchar(255) NOT NULL, product_count integer NOT NULL CHECK(product_count>0),
      published_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_bill_catalogue_publication_import FOREIGN KEY(tenant_id,import_id)
        REFERENCES public.bill_catalogue_imports(tenant_id,id),
      UNIQUE(tenant_id,idempotency_key), UNIQUE(tenant_id,import_id),
      UNIQUE(tenant_id,provider_code,catalogue_version), UNIQUE(tenant_id,id)
    );
    CREATE INDEX idx_bill_catalogue_import_status ON public.bill_catalogue_imports(tenant_id,status,created_at DESC);
    CREATE INDEX idx_bill_catalogue_items_import ON public.bill_catalogue_import_items(tenant_id,import_id);

    CREATE FUNCTION public.protect_published_bill_product_version() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published bill product versions are immutable'; END IF;
      IF OLD.effective_to IS NULL AND NEW.effective_to IS NOT NULL AND
         (to_jsonb(NEW)-'effective_to'-'updated_at')=(to_jsonb(OLD)-'effective_to'-'updated_at')
      THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Published bill product versions are immutable';
    END $$;
    DROP TRIGGER trg_protect_published_bill_product ON public.bill_products;
    CREATE TRIGGER trg_protect_published_bill_product BEFORE UPDATE OR DELETE ON public.bill_products
      FOR EACH ROW WHEN(OLD.published_at IS NOT NULL) EXECUTE FUNCTION public.protect_published_bill_product_version();

    CREATE TRIGGER trg_protect_bill_catalogue_item BEFORE UPDATE OR DELETE ON public.bill_catalogue_import_items
      FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();
    CREATE TRIGGER trg_protect_bill_catalogue_publication BEFORE UPDATE OR DELETE ON public.bill_catalogue_publications
      FOR EACH ROW EXECUTE FUNCTION public.protect_bill_immutable();

    ALTER TABLE public.bill_catalogue_imports ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_catalogue_imports FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.bill_catalogue_import_items ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_catalogue_import_items FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.bill_catalogue_publications ENABLE ROW LEVEL SECURITY; ALTER TABLE public.bill_catalogue_publications FORCE ROW LEVEL SECURITY;
    CREATE POLICY bill_catalogue_import_tenant_policy ON public.bill_catalogue_imports USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY bill_catalogue_item_tenant_policy ON public.bill_catalogue_import_items USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    CREATE POLICY bill_catalogue_publication_tenant_policy ON public.bill_catalogue_publications USING(tenant_id=public.current_tenant_id()) WITH CHECK(tenant_id=public.current_tenant_id());
    GRANT SELECT,INSERT,UPDATE ON public.bill_catalogue_imports TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT,INSERT ON public.bill_catalogue_import_items,public.bill_catalogue_publications TO parc_payment_runtime,parc_payment_worker;
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("Monnify catalogue controls are forward-only"),
  );
}
