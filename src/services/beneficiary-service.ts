import { createHash } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";

export type BeneficiaryKind = "all" | "recent" | "favourite";

export interface BeneficiaryView {
  id: string;
  name: string;
  nickname: string | null;
  account_number: string | null;
  bank_code: string | null;
  bank_name: string | null;
  is_verified: boolean;
  is_favourite: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface BeneficiaryRow {
  id: string;
  name: string;
  nickname: string | null;
  account_number: string | null;
  bank_code: string | null;
  bank_name: string | null;
  is_verified: boolean;
  is_favourite: boolean;
  created_at: Date | string;
  last_used_at: Date | string | null;
}

const RECENT_LIMIT = 10;
const IDEMPOTENCY_TTL_MS = 86_400_000;

/** Customer-owned bank-account beneficiaries, always scoped to tenant and customer. */
export class BeneficiaryService {
  public constructor(private readonly db: Knex) {}

  public list(
    tenantId: string,
    customerId: string,
    kind: BeneficiaryKind,
  ): Promise<{ items: BeneficiaryView[] }> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const query = selectBeneficiaries(tx, tenantId, customerId);
      if (kind === "favourite") query.where("b.is_favourite", true);
      if (kind === "recent")
        query
          .whereNotNull("usage.last_used_at")
          .orderBy("usage.last_used_at", "desc")
          .limit(RECENT_LIMIT);
      else query.orderBy([{ column: "b.name" }, { column: "b.id" }]);
      return { items: (await query).map(view) };
    });
  }

  /**
   * Saves a bank-account beneficiary. Saving the same account twice returns
   * the existing beneficiary; replaying an idempotency key returns the first
   * response, and reusing it for a different request is rejected.
   */
  public create(input: {
    tenantId: string;
    customerId: string;
    bankCode: string;
    accountNumber: string;
    name: string;
    idempotencyKey: string;
  }): Promise<{ status: 200 | 201; body: BeneficiaryView }> {
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          bank_code: input.bankCode,
          account_number: input.accountNumber,
          name: input.name,
        }),
      )
      .digest("hex");
    return withTenantTransaction(this.db, input.tenantId, async (tx) => {
      // payment_idempotency_keys has no unique key, so serialize this
      // customer's beneficiary commands for the rest of the transaction.
      await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [
        `payment-beneficiary:${input.tenantId}:${input.customerId}`,
      ]);
      const replay = await tx("payment_idempotency_keys")
        .where({
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          idempotency_key: input.idempotencyKey,
          resource_type: "beneficiary",
        })
        .where("expires_at", ">", tx.fn.now())
        .first<{
          request_hash: string;
          response_status: number;
          response_body: BeneficiaryView;
        }>("request_hash", "response_status", "response_body");
      if (replay) {
        if (replay.request_hash !== requestHash)
          throw new Error("IDEMPOTENCY_KEY_REUSED");
        return {
          status: replay.response_status === 201 ? 201 : 200,
          body: replay.response_body,
        };
      }
      const existing = await tx("beneficiaries")
        .where({
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          beneficiary_type: "BANK_ACCOUNT",
          bank_code: input.bankCode,
          account_number: input.accountNumber,
        })
        .whereNull("deleted_at")
        .first("id");
      const id: string = existing
        ? String(existing.id)
        : String(
            (
              await tx("beneficiaries")
                .insert({
                  tenant_id: input.tenantId,
                  customer_id: input.customerId,
                  beneficiary_type: "BANK_ACCOUNT",
                  name: input.name,
                  account_number: input.accountNumber,
                  bank_code: input.bankCode,
                  is_verified: false,
                  created_by: input.customerId,
                })
                .returning<{ id: string }[]>("id")
            )[0]!.id,
          );
      const row = await selectBeneficiaries(
        tx,
        input.tenantId,
        input.customerId,
      )
        .where("b.id", id)
        .first();
      if (!row) throw new Error("BENEFICIARY_NOT_FOUND");
      const body = view(row);
      const status = existing ? 200 : 201;
      await tx("payment_idempotency_keys").insert({
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        idempotency_key: input.idempotencyKey,
        request_hash: requestHash,
        resource_type: "beneficiary",
        resource_id: id,
        response_status: status,
        response_body: body,
        expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      });
      return { status, body };
    });
  }
}

function selectBeneficiaries(
  tx: Knex.Transaction,
  tenantId: string,
  customerId: string,
): Knex.QueryBuilder<BeneficiaryRow, BeneficiaryRow[]> {
  const lastUsed = tx("payment_external_transfers")
    .where({ tenant_id: tenantId, customer_id: customerId })
    .whereNotNull("beneficiary_id")
    .groupBy("beneficiary_id")
    .select("beneficiary_id", tx.raw("max(created_at) AS last_used_at"))
    .as("usage");
  return tx<BeneficiaryRow>("beneficiaries as b")
    .leftJoin(lastUsed, "usage.beneficiary_id", "b.id")
    .where({
      "b.tenant_id": tenantId,
      "b.customer_id": customerId,
      "b.beneficiary_type": "BANK_ACCOUNT",
    })
    .whereNull("b.deleted_at")
    .select(
      "b.id",
      "b.name",
      "b.nickname",
      "b.account_number",
      "b.bank_code",
      "b.bank_name",
      "b.is_verified",
      "b.is_favourite",
      "b.created_at",
      "usage.last_used_at",
    );
}

function view(row: BeneficiaryRow): BeneficiaryView {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    account_number: row.account_number,
    bank_code: row.bank_code,
    bank_name: row.bank_name,
    is_verified: row.is_verified,
    is_favourite: row.is_favourite,
    created_at: new Date(row.created_at).toISOString(),
    last_used_at: row.last_used_at
      ? new Date(row.last_used_at).toISOString()
      : null,
  };
}
