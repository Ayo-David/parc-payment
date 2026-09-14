import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";

export class CustomerBillQueryService {
  constructor(private readonly db: Knex) {}

  listProducts(tenantId: string, category: string): Promise<unknown[]> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("bill_products as p")
        .join("bill_categories as c", "c.id", "p.category_id")
        .join("bill_providers as bp", function () {
          this.on("bp.id", "=", "p.provider_id").andOn(
            "bp.tenant_id",
            "=",
            "p.tenant_id",
          );
        })
        .where({
          "p.tenant_id": tenantId,
          "c.category": category.toUpperCase(),
          "p.is_active": true,
          "bp.is_active": true,
        })
        .whereNotNull("p.published_at")
        .where("p.effective_from", "<=", tx.fn.now())
        .where((query) =>
          query
            .whereNull("p.effective_to")
            .orWhere("p.effective_to", ">", tx.fn.now()),
        )
        .select(
          "p.id",
          "p.product_code",
          "p.product_name",
          "p.description",
          "p.denomination_type",
          "p.amount as amount_minor",
          "p.min_amount as min_amount_minor",
          "p.max_amount as max_amount_minor",
          "p.currency",
          "p.catalogue_version",
          "bp.provider_code as provider",
        )
        .orderBy("p.product_name"),
    );
  }

  async get(
    tenantId: string,
    customerId: string,
    id: string,
    receiptOnly: boolean,
  ): Promise<unknown> {
    const row = await withTenantTransaction(this.db, tenantId, (tx) =>
      tx("bill_transactions")
        .where({ tenant_id: tenantId, customer_id: customerId, id })
        .first<{
          id: string;
          status: string;
          amount: string;
          fee_amount: string;
          tax_amount: string;
          total_debit: string;
          currency: string;
          provider_reference: string | null;
          response_payload: { receipt?: string; token?: string } | null;
          completed_at: Date | null;
        }>(),
    );
    if (!row) throw new Error("BILL_NOT_FOUND");
    if (receiptOnly) {
      if (row.status !== "SUCCESSFUL") throw new Error("RECEIPT_NOT_READY");
      return {
        bill_id: row.id,
        provider_reference: row.provider_reference,
        receipt: row.response_payload?.receipt ?? null,
        token: row.response_payload?.token ?? null,
        completed_at: row.completed_at?.toISOString() ?? null,
      };
    }
    return {
      id: row.id,
      status: row.status,
      amount_minor: row.amount,
      fee_minor: row.fee_amount,
      tax_minor: row.tax_amount,
      total_debit_minor: row.total_debit,
      currency: row.currency,
      provider_reference: row.provider_reference,
    };
  }
}
