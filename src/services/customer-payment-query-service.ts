import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";

export class CustomerPaymentQueryService {
  public constructor(private readonly db: Knex) {}
  public transactions(
    tenantId: string,
    customerId: string,
    pageSize: number,
  ): Promise<{ items: unknown[] }> {
    return withTenantTransaction(this.db, tenantId, async (tx) => ({
      items: await tx("payment_transactions")
        .where({ tenant_id: tenantId, customer_id: customerId })
        .whereNull("deleted_at")
        .orderBy("created_at", "desc")
        .limit(pageSize)
        .select(
          "id",
          "payment_type",
          "amount",
          "currency",
          "status",
          "reference",
          "narration",
          "requested_at",
          "processed_at",
        ),
    }));
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
