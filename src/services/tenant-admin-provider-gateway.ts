import type { PaymentCapability } from "./payment-provider.js";
export interface ProviderSelection {
  id: string;
  tenant_id: string;
  capability: PaymentCapability;
  currency: string | null;
  provider: string;
  version: number;
  approval_id: string;
  selected_at: string;
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
