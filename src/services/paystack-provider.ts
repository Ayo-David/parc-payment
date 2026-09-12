import type {
  PaymentProvider,
  ProviderInquiryContext,
  ProviderSubmission,
  VirtualAccountProvider,
  VirtualAccountResult,
} from "./payment-provider.js";
import { ProviderOutcomeAmbiguousError } from "./payment-provider.js";
import { z } from "zod";

const virtualAccountSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  preferredBank: z.string().min(1).max(50).default("titan-paystack"),
});
const transferSchema = z.object({
  recipientCode: z.string().min(1).max(100),
  narration: z.string().min(1).max(100),
});

export class PaystackProvider
  implements PaymentProvider, VirtualAccountProvider
{
  public readonly code = "PAYSTACK";
  public constructor(
    private readonly secret: string,
    private readonly baseUrl = "https://api.paystack.co",
    private readonly http: typeof fetch = fetch,
  ) {}
  public supports(capability: string, currency: string): boolean {
    return (
      currency === "NGN" &&
      (capability === "COLLECTION" ||
        capability === "VIRTUAL_ACCOUNT" ||
        capability === "INTERBANK_TRANSFER")
    );
  }
  public async submit(input: {
    operationId: string;
    capability:
      "VIRTUAL_ACCOUNT" | "COLLECTION" | "INTERBANK_TRANSFER" | "DIRECT_DEBIT";
    currency: string;
    amountMinor: string;
    idempotencyKey: string;
    customerEmail?: string;
    providerData?: unknown;
  }): Promise<ProviderSubmission> {
    if (input.capability === "INTERBANK_TRANSFER")
      return this.submitTransfer(input);
    if (
      !this.supports(input.capability, input.currency) ||
      !input.customerEmail
    )
      throw new Error("Paystack collection requires NGN and a customer email");
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Amount must be positive integer minor units");
    const response = await this.http(
      new URL("/transaction/initialize", this.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: input.customerEmail,
          amount: input.amountMinor,
          currency: input.currency,
          reference: input.operationId,
          metadata: JSON.stringify({ idempotency_key: input.idempotencyKey }),
        }),
      },
    );
    const body = (await response.json()) as {
      status?: boolean;
      data?: { reference?: string };
    };
    if (!response.ok || body.status !== true || !body.data?.reference)
      throw new Error(`Paystack initialization failed with ${response.status}`);
    return { providerReference: body.data.reference, state: "PENDING" };
  }
  public async inquire(
    providerReference: string,
    context?: ProviderInquiryContext,
  ): Promise<ProviderSubmission> {
    const response = await this.http(
      new URL(
        context?.capability === "INTERBANK_TRANSFER"
          ? `/transfer/verify/${encodeURIComponent(providerReference)}`
          : `/transaction/verify/${encodeURIComponent(providerReference)}`,
        this.baseUrl,
      ),
      { headers: { authorization: `Bearer ${this.secret}` } },
    );
    const body = (await response.json()) as {
      status?: boolean;
      data?: { reference?: string; status?: string };
    };
    if (!response.ok || body.status !== true || !body.data?.reference)
      throw new Error(`Paystack inquiry failed with ${response.status}`);
    const state =
      body.data.status === "success"
        ? "SUCCESS"
        : body.data.status === "failed" || body.data.status === "abandoned"
          ? "FAILED"
          : "PENDING";
    return { providerReference: body.data.reference, state };
  }

  private async submitTransfer(input: {
    operationId: string;
    currency: string;
    amountMinor: string;
    providerData?: unknown;
  }): Promise<ProviderSubmission> {
    if (input.currency !== "NGN" || !/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Paystack transfer requires positive NGN minor units");
    const data = transferSchema.parse(input.providerData);
    const reference = `parc-${input.operationId.toLowerCase()}`.slice(0, 50);
    let response: Response;
    try {
      response = await this.http(new URL("/transfer", this.baseUrl), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          source: "balance",
          amount: input.amountMinor,
          recipient: data.recipientCode,
          reference,
          reason: data.narration,
          currency: input.currency,
        }),
      });
    } catch (error) {
      throw new ProviderOutcomeAmbiguousError(
        `Paystack transfer outcome is ambiguous: ${error instanceof Error ? error.message : "transport failure"}`,
      );
    }
    const body = (await response.json()) as {
      status?: boolean;
      data?: { reference?: string; status?: string };
    };
    if (!response.ok || body.status !== true || !body.data?.reference)
      return {
        providerReference: reference,
        state: "FAILED",
        providerStatus: "FAILED",
      };
    const status = body.data.status ?? "pending";
    return {
      providerReference: body.data.reference,
      state:
        status === "success"
          ? "SUCCESS"
          : status === "failed" || status === "reversed"
            ? "FAILED"
            : "PENDING",
      providerStatus: status,
    };
  }

  public async createVirtualAccount(
    input: unknown,
  ): Promise<VirtualAccountResult> {
    const data = virtualAccountSchema.parse(input);
    const customerResponse = await this.http(
      new URL("/customer", this.baseUrl),
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        }),
      },
    );
    const customerBody = (await customerResponse.json()) as {
      status?: boolean;
      data?: { customer_code?: string };
    };
    if (
      !customerResponse.ok ||
      customerBody.status !== true ||
      !customerBody.data?.customer_code
    )
      throw new Error(
        `Paystack customer creation failed with ${customerResponse.status}`,
      );
    const accountResponse = await this.http(
      new URL("/dedicated_account", this.baseUrl),
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          customer: customerBody.data.customer_code,
          preferred_bank: data.preferredBank,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        }),
      },
    );
    const accountBody = (await accountResponse.json()) as {
      status?: boolean;
      data?: { id?: number; account_number?: string };
    };
    if (
      !accountResponse.ok ||
      accountBody.status !== true ||
      !accountBody.data?.id ||
      !accountBody.data.account_number
    )
      throw new Error(
        `Paystack virtual account creation failed with ${accountResponse.status}`,
      );
    return {
      accountNumber: accountBody.data.account_number,
      providerCustomerReference: customerBody.data.customer_code,
      providerAccountReference: String(accountBody.data.id),
    };
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.secret}`,
      "content-type": "application/json",
    };
  }
}
