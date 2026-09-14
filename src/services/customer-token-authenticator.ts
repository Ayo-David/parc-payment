import { z } from "zod";

const result = z.object({
  active: z.literal(true),
  subject: z.string().uuid(),
  tenant_id: z.string().uuid(),
  subject_type: z.literal("CUSTOMER"),
});

export interface PaymentCustomerPrincipal {
  tenantId: string;
  customerId: string;
}
export interface PaymentCustomerAuthenticator {
  authenticate(token: string): Promise<PaymentCustomerPrincipal>;
}

export class HttpPaymentCustomerAuthenticator implements PaymentCustomerAuthenticator {
  public constructor(
    private readonly authUrl: string,
    private readonly serviceToken: string,
  ) {}
  public async authenticate(token: string): Promise<PaymentCustomerPrincipal> {
    const response = await fetch(
      new URL("/internal/v1/tokens/introspect", this.authUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token: token.replace(/^Bearer\s+/i, ""),
          audience: "parc-payment",
        }),
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) throw new Error("TOKEN_INTROSPECTION_FAILED");
    const parsed = result.safeParse(await response.json());
    if (!parsed.success) throw new Error("TOKEN_INACTIVE");
    return { tenantId: parsed.data.tenant_id, customerId: parsed.data.subject };
  }
}
