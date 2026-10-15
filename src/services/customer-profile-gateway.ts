import { z } from "zod";
import type { ParcTokenClient } from "../security/parc-service-auth.js";
import type { VirtualAccountHolder } from "./payment-provider.js";

const providerProfile = z.object({
  customer_id: z.string().uuid(),
  first_name: z.string().min(1),
  middle_name: z.string().nullable(),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone_number: z.string().min(7),
  bvn: z
    .string()
    .regex(/^[0-9]{11}$/)
    .nullable()
    .optional(),
});

/** The account holder plus the BVN verified at onboarding, if Auth has one. */
export interface CustomerProviderProfile {
  holder: VirtualAccountHolder;
  bvn: string | null;
}

export interface CustomerProfileGateway {
  profile(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerProviderProfile>;
}

/**
 * Reads the identity-verified customer's legal name, contacts and stored BVN
 * from Auth with a service token. The values go to the provider and are not
 * stored or logged by Payment.
 */
export class AuthCustomerProfileGateway implements CustomerProfileGateway {
  public constructor(
    private readonly baseUrl: string,
    private readonly tokens: Pick<ParcTokenClient, "authorization">,
  ) {}

  public async profile(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerProviderProfile> {
    const response = await fetch(
      new URL(
        `/internal/v1/tenants/${encodeURIComponent(tenantId)}/customers/${encodeURIComponent(customerId)}/provider-profile`,
        this.baseUrl,
      ),
      {
        headers: {
          accept: "application/json",
          authorization: await this.tokens.authorization({
            audience: "parc-auth-customer",
            scopes: ["auth.customer-provider-profile.read"],
            tenantId,
            // Service-only scope: never exchange the customer's token for it,
            // even when this runs inside a customer-initiated request.
            mode: "service",
          }),
          "x-tenant-id": tenantId,
          "x-calling-service": "parc-payment",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 404 || response.status === 409)
      throw new Error("CUSTOMER_PROFILE_INCOMPLETE");
    if (!response.ok)
      throw new Error(
        `Customer profile unavailable (${String(response.status)})`,
      );
    const profile = providerProfile.parse(await response.json());
    if (profile.customer_id !== customerId)
      throw new Error("Customer profile mismatch");
    return {
      holder: {
        email: profile.email,
        firstName: profile.first_name,
        ...(profile.middle_name ? { middleName: profile.middle_name } : {}),
        lastName: profile.last_name,
        phone: profile.phone_number,
      },
      bvn: profile.bvn ?? null,
    };
  }
}
