import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Knex } from "knex";
const snapshotUrl = new URL("../schema/current.sql", import.meta.url);
const approvedExistingBaselineHash =
  "29ce49ba408d904bae0f8c1c15331d83c939fea789c54a908cbac65e0a8420c2";
const canonicalSnapshotHash =
  "f2f0607400dd70500520fd515c26fbf351ccc74934940c0f458a19b1b308d93c";
export const config = { transaction: false };
/** Applies the verified payment schema baseline and grants service roles access. */
export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable("payment_transactions")) {
    if (
      process.env.APPROVED_EXISTING_BASELINE_SHA256 !==
      approvedExistingBaselineHash
    )
      throw new Error(
        "Existing Payment schema requires the approved baseline SHA-256",
      );
    return;
  }
  await knex.raw(`DO $roles$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_runtime') THEN CREATE ROLE parc_payment_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_worker') THEN CREATE ROLE parc_payment_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='parc_payment_readonly') THEN CREATE ROLE parc_payment_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF;
  END $roles$;`);
  const sql = await readFile(fileURLToPath(snapshotUrl), "utf8");
  if (createHash("sha256").update(sql).digest("hex") !== canonicalSnapshotHash)
    throw new Error("Payment schema snapshot hash mismatch");
  await knex.raw(sql);
  await knex.raw("SET search_path TO public");
  await knex.raw(`
    GRANT USAGE ON SCHEMA public TO parc_payment_runtime,parc_payment_worker,parc_payment_readonly;
    GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO parc_payment_runtime,parc_payment_worker;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO parc_payment_readonly;
    GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO parc_payment_runtime,parc_payment_worker;
  `);
}
/** Rejects rollback because the payment schema baseline is forward-only. */
export function down(): Promise<never> {
  return Promise.reject(new Error("Payment baseline is forward-only"));
}
