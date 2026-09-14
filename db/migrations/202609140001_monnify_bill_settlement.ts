import type { Knex } from "knex";

/** Approved tenant-scoped Ledger destinations used for bill settlement. */
export async function up(knex: Knex): Promise<void> {
  if (
    await knex.schema.hasColumn(
      "bill_providers",
      "provider_payable_ledger_account_id",
    )
  )
    return;
  await knex.raw(`
    ALTER TABLE public.bill_providers
      ADD COLUMN provider_payable_ledger_account_id uuid,
      ADD COLUMN revenue_ledger_account_id uuid,
      ADD COLUMN tax_ledger_account_id uuid,
      ADD COLUMN cashback_ledger_account_id uuid;
    COMMENT ON COLUMN public.bill_providers.provider_payable_ledger_account_id IS
      'Opaque account identifier owned and validated by Ledger; never a cross-database foreign key.';
  `);
}

export function down(): Promise<never> {
  return Promise.reject(
    new Error("Bill settlement account configuration is forward-only"),
  );
}
