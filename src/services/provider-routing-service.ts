import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type {
  PaymentCapability,
  PaymentProvider,
  ProviderRegistry,
} from "./payment-provider.js";
import type { ProviderSelectionGateway } from "./tenant-admin-provider-gateway.js";

export class ProviderRoutingService {
  public constructor(
    private readonly db: Knex,
    private readonly selections: ProviderSelectionGateway,
    private readonly registry: ProviderRegistry,
  ) {}
  public async select(input: {
    tenantId: string;
    capability: PaymentCapability;
    currency: string;
    correlationId: string;
    idempotencyKey: string;
    excludedProvider?: string;
    reason?: "CIRCUIT_OPEN" | "PRE_SUBMISSION_FAILURE";
  }): Promise<{
    provider: PaymentProvider;
    decisionId: string;
    replayed: boolean;
  }> {
    if (input.currency !== "NGN")
      throw new Error("Currency is not operationally enabled");
    const selection = await this.selections.resolve(
      input.tenantId,
      input.capability,
      input.currency,
    );
    if (input.excludedProvider && selection.provider === input.excludedProvider)
      throw new Error("No approved fallback provider is currently resolved");
    const provider = this.registry.require(
      selection.provider,
      input.capability,
      input.currency,
    );
    const requestHash = hash({
      capability: input.capability,
      currency: input.currency,
      provider: selection.provider,
      selectionId: selection.id,
      selectionVersion: selection.version,
      reason: input.reason ?? "PREFERRED",
    });
    const result = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("payment_provider_routing_decisions")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<{
            id: string;
            provider_code: string;
            request_hash?: string;
          }>();
        if (existing) {
          if (existing.provider_code !== selection.provider)
            throw new Error(
              "Routing idempotency key was reused after provider selection changed",
            );
          return { id: existing.id, replayed: true };
        }
        const id = randomUUID();
        await tx("payment_provider_routing_decisions").insert({
          id,
          tenant_id: input.tenantId,
          capability: input.capability,
          currency: input.currency,
          provider_code: selection.provider,
          selection_id: selection.id,
          selection_version: selection.version,
          routing_reason: input.reason ?? "PREFERRED",
          correlation_id: input.correlationId,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
        });
        return { id, replayed: false };
      },
    );
    return { provider, decisionId: result.id, replayed: result.replayed };
  }
}
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
