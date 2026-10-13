import type { Knex } from "knex";
import { z } from "zod";
import { withTenantTransaction } from "../database/client.js";

export interface TransactionPage {
  items: Record<string, unknown>[];
  page: { next_cursor: string | null; has_more: boolean };
}

const cursorSchema = z.object({ v: z.literal(1), id: z.string().uuid() });

/** Opaque keyset cursor naming the last row of the previous page. */
export function encodeTransactionCursor(id: string): string {
  return Buffer.from(JSON.stringify({ v: 1, id })).toString("base64url");
}

export function decodeTransactionCursor(cursor: string): string {
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    ).id;
  } catch {
    throw new Error("INVALID_PAGE_CURSOR");
  }
}

export class CustomerPaymentQueryService {
  public constructor(private readonly db: Knex) {}
  /** Newest first, ordered by (created_at, id) so pages never skip or repeat rows. */
  public transactions(
    tenantId: string,
    customerId: string,
    pageSize: number,
    cursor?: string,
  ): Promise<TransactionPage> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const afterId = cursor ? decodeTransactionCursor(cursor) : undefined;
      const query = tx("payment_transactions")
        .where({ tenant_id: tenantId, customer_id: customerId })
        .whereNull("deleted_at");
      if (afterId) {
        const anchor = await tx("payment_transactions")
          .where({ tenant_id: tenantId, customer_id: customerId, id: afterId })
          .first("id");
        if (!anchor) throw new Error("INVALID_PAGE_CURSOR");
        // Compare in SQL so created_at keeps its microsecond precision.
        query.whereRaw(
          "(created_at, id) < (SELECT created_at, id FROM payment_transactions WHERE tenant_id = ? AND id = ?)",
          [tenantId, afterId],
        );
      }
      const rows = await query
        .orderBy([
          { column: "created_at", order: "desc" },
          { column: "id", order: "desc" },
        ])
        .limit(pageSize + 1)
        .select<Record<string, unknown>[]>(
          "id",
          "payment_type",
          "amount",
          "currency",
          "status",
          "reference",
          "narration",
          "requested_at",
          "processed_at",
        );
      const items = rows.slice(0, pageSize);
      const hasMore = rows.length > pageSize;
      return {
        items,
        page: {
          next_cursor: hasMore
            ? encodeTransactionCursor(String(items[items.length - 1]!.id))
            : null,
          has_more: hasMore,
        },
      };
    });
  }
  public fundingDetails(
    tenantId: string,
    customerId: string,
  ): Promise<{
    id: string;
    source_account_id: string;
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
    currency: string;
  }> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const row = await tx("financial_accounts")
        .where({
          tenant_id: tenantId,
          customer_id: customerId,
          account_type: "VIRTUAL_BANK_ACCOUNT",
          status: "ACTIVE",
        })
        .whereNull("deleted_at")
        .whereNotNull("ledger_account_id")
        .orderBy("is_primary", "desc")
        .orderBy("created_at")
        .first({
          id: "id",
          source_account_id: "ledger_account_id",
          account_number: "account_number",
          account_name: "account_name",
          bank_code: "bank_code",
          bank_name: "bank_name",
          currency: "currency",
        });
      if (!row) throw new Error("FUNDING_ACCOUNT_NOT_FOUND");
      return row;
    });
  }
  public transfer(
    tenantId: string,
    customerId: string,
    id: string,
    receipt: boolean,
  ): Promise<unknown> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const row = await tx("payment_external_transfers")
        .where({ tenant_id: tenantId, customer_id: customerId, id })
        .first(
          "id",
          "payment_id",
          "beneficiary_name",
          "destination_account_number",
          "destination_bank_code",
          "destination_bank_name",
          "amount",
          "currency",
          "narration",
          "status",
          "failure_code",
          "completed_at",
          "created_at",
        );
      if (!row) throw new Error("TRANSFER_NOT_FOUND");
      if (receipt && !["SUCCEEDED", "REVERSED"].includes(String(row.status)))
        throw new Error("RECEIPT_NOT_READY");
      return row;
    });
  }
}
