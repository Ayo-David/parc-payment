import type { PaymentCapability } from "./payment-provider.js";
export interface ProviderSelection {
  id: string;
  tenant_id: string;
  capability: PaymentCapability;
  currency: string | null;
  provider: string;
  version: number;
  approval_id: string | null;
  selected_at: string;
  source?: "PLATFORM_DEFAULT" | "TENANT_OVERRIDE";
}
export interface ProviderSelectionGateway {
  resolve(
    tenantId: string,
    capability: PaymentCapability,
    currency: string,
  ): Promise<ProviderSelection>;
}
export class TenantAdminProviderGateway implements ProviderSelectionGateway {
  public constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}
  public async resolve(
    tenantId: string,
    capability: PaymentCapability,
    currency: string,
  ): Promise<ProviderSelection> {
    const path = `/internal/v1/tenants/${tenantId}/provider-selection/${capability}?currency=${encodeURIComponent(currency)}`;
    const response = await fetch(new URL(path, this.baseUrl), {
      headers: {
        "x-service-token": this.token,
        "x-service-name": "parc-payment",
      },
    });
    if (!response.ok)
      throw new Error(
        `Tenant Admin provider resolution failed with ${response.status}`,
      );
    return response.json() as Promise<ProviderSelection>;
  }
}

export interface ApprovalConsumptionGateway {
  consume(input: {
    tenantId: string;
    approvalId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    payloadHash: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<void>;
}

export class TenantAdminApprovalGateway implements ApprovalConsumptionGateway {
  public constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  public async consume(
    input: Parameters<ApprovalConsumptionGateway["consume"]>[0],
  ): Promise<void> {
    const response = await fetch(
      new URL(
        `/internal/v1/approvals/${input.approvalId}/consume`,
        this.baseUrl,
      ),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
          "x-correlation-id": input.correlationId,
          "x-tenant-id": input.tenantId,
          "x-service-token": this.token,
          "x-service-name": "parc-payment",
        },
        body: JSON.stringify({
          action: input.action,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          payload_hash: input.payloadHash,
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        `Tenant Admin approval consumption failed with ${response.status}`,
      );
  }
}
