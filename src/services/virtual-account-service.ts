import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { VirtualAccountProvider } from "./payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

export class VirtualAccountService {
  public constructor(
    private readonly db: Knex,
    private readonly routing: ProviderRoutingService,
  ) {}

  public async create(input: {
    tenantId: string;
    customerId: string;
    currency: string;
    idempotencyKey: string;
    correlationId: string;
    accountName: string;
    providerData: unknown;
  }): Promise<{
    id: string;
    status: string;
    accountNumber?: string;
    replayed: boolean;
  }> {
    const routed = await this.routing.select({
      tenantId: input.tenantId,
      capability: "VIRTUAL_ACCOUNT",
      currency: input.currency,
      correlationId: input.correlationId,
      idempotencyKey: `virtual-account:${input.idempotencyKey}`,
    });
    if (!("createVirtualAccount" in routed.provider))
      throw new Error("Resolved provider cannot provision virtual accounts");
    const provider = routed.provider as VirtualAccountProvider;
    const requestHash = hash({
      customerId: input.customerId,
      currency: input.currency,
      provider: provider.code,
      routingDecisionId: routed.decisionId,
    });
    const prepared = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("virtual_account_provisioning_requests")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<{
            id: string;
            financial_account_id: string;
            request_hash: string;
            status: string;
          }>();
        if (existing) {
          if (existing.request_hash !== requestHash)
            throw new Error(
              "Idempotency key reused with different virtual-account request",
            );
          return { request: existing, replayed: true };
        }
        const providerRow = await tx("account_providers")
          .where({
            tenant_id: input.tenantId,
            provider_code: provider.code,
            is_active: true,
          })
          .whereNull("deleted_at")
          .first<{ id: string }>("id");
        if (!providerRow)
          throw new Error(
            "Tenant provider account configuration is unavailable",
          );
        const accountId = randomUUID();
        const requestId = randomUUID();
        await tx("financial_accounts").insert({
          id: accountId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          provider_id: providerRow.id,
          account_type: "VIRTUAL_BANK_ACCOUNT",
          account_name: input.accountName,
          currency: input.currency,
          status: "PENDING",
        });
        await tx("virtual_account_provisioning_requests").insert({
          id: requestId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          financial_account_id: accountId,
          routing_decision_id: routed.decisionId,
          provider_code: provider.code,
          currency: input.currency,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
        });
        return {
          request: {
            id: requestId,
            financial_account_id: accountId,
            request_hash: requestHash,
            status: "PENDING",
          },
          replayed: false,
        };
      },
    );
    const current = await this.read(input.tenantId, prepared.request.id);
    if (current.status === "ACTIVE") return { ...current, replayed: true };
    const result = await provider.createVirtualAccount(input.providerData);
    await withTenantTransaction(this.db, input.tenantId, async (tx) => {
      const providerRow = await tx("account_providers")
        .where({ tenant_id: input.tenantId, provider_code: provider.code })
        .first<{ id: string }>("id");
      if (!providerRow) throw new Error("Provider configuration disappeared");
      await tx("financial_accounts")
        .where({
          tenant_id: input.tenantId,
          id: prepared.request.financial_account_id,
        })
        .update({
          account_number: result.accountNumber,
          provider_reference:
            result.providerAccountReference ?? result.accountNumber,
          account_name: result.accountName ?? input.accountName,
          bank_code: result.bankCode ?? null,
          bank_name: result.bankName ?? provider.code,
          status: "ACTIVE",
        });
      await tx("account_provider_accounts")
        .insert({
          tenant_id: input.tenantId,
          account_id: prepared.request.financial_account_id,
          provider_id: providerRow.id,
          provider_account_id:
            result.providerAccountReference ?? result.accountNumber,
          provider_account_number: result.accountNumber,
          provider_metadata: {},
        })
        .onConflict(["provider_id", "provider_account_id"])
        .ignore();
      await tx("virtual_account_provisioning_requests")
        .where({ tenant_id: input.tenantId, id: prepared.request.id })
        .update({
          status: "ACTIVE",
          provider_customer_reference: result.providerCustomerReference,
          provider_account_reference:
            result.providerAccountReference ?? result.accountNumber,
          submitted_at: tx.fn.now(),
          completed_at: tx.fn.now(),
        });
      await tx("account_status_history").insert({
        tenant_id: input.tenantId,
        account_id: prepared.request.financial_account_id,
        previous_status: "PENDING",
        new_status: "ACTIVE",
        reason: "Provider account provisioned",
      });
    });
    return {
      ...(await this.read(input.tenantId, prepared.request.id)),
      replayed: prepared.replayed,
    };
  }

  private async read(
    tenantId: string,
    requestId: string,
  ): Promise<{ id: string; status: string; accountNumber?: string }> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const row = await tx("virtual_account_provisioning_requests as r")
        .join("financial_accounts as a", "a.id", "r.financial_account_id")
        .where("r.tenant_id", tenantId)
        .where("r.id", requestId)
        .first<{ id: string; status: string; account_number: string | null }>(
          "r.id",
          "r.status",
          "a.account_number",
        );
      if (!row) throw new Error("Virtual-account request not found");
      return {
        id: row.id,
        status: row.status,
        ...(row.account_number ? { accountNumber: row.account_number } : {}),
      };
    });
  }
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
