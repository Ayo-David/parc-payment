import type {
  BillCustomerValidation,
  BillFulfilment,
  BillPaymentProvider,
} from "./bill-payment-provider.js";
import type {
  PaymentCapability,
  PaymentProvider,
  ProviderSubmission,
} from "./payment-provider.js";

type MonnifyEnvelope = {
  requestSuccessful?: boolean;
  responseMessage?: string;
  responseCode?: string;
  responseBody?: Record<string, unknown>;
};

type CachedToken = { value: string; expiresAt: number };

/** Official Monnify Bills Payment adapter. Monetary input remains exact minor-unit strings. */
export class MonnifyBillPaymentProvider
  implements BillPaymentProvider, PaymentProvider
{
  readonly code = "MONNIFY";
  private token?: CachedToken;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly clientSecret: string,
    private readonly http: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  supports(capability: PaymentCapability, currency: string): boolean {
    return capability === "BILL_PAYMENT" && currency === "NGN";
  }

  submit(): Promise<ProviderSubmission> {
    return Promise.reject(
      new Error("Use the typed Monnify bill-payment fulfilment operation"),
    );
  }

  async categories(pageSize = 100, page = 0): Promise<Record<string, unknown>> {
    return requiredBody(
      await this.request(
        `/api/v1/vas/bills-payment/biller-categories?size=${pageSize}&page=${page}`,
        { method: "GET" },
      ),
    );
  }

  async billers(
    categoryCode: string,
    pageSize = 100,
    page = 0,
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      category_code: categoryCode,
      size: String(pageSize),
      page: String(page),
    });
    return requiredBody(
      await this.request(`/api/v1/vas/bills-payment/billers?${query}`, {
        method: "GET",
      }),
    );
  }

  async products(
    billerCode: string,
    pageSize = 100,
    page = 0,
  ): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({
      biller_code: billerCode,
      size: String(pageSize),
      page: String(page),
    });
    return requiredBody(
      await this.request(`/api/v1/vas/bills-payment/biller-products?${query}`, {
        method: "GET",
      }),
    );
  }

  async validateCustomer(input: {
    productCode: string;
    customerIdentifier: string;
  }): Promise<BillCustomerValidation> {
    const body = await this.request(
      "/api/v1/vas/bills-payment/validate-customer",
      {
        method: "POST",
        body: JSON.stringify({
          productCode: input.productCode,
          customerId: input.customerIdentifier,
        }),
      },
    );
    const response = requiredBody(body);
    const instruction = objectValue(response.vendInstruction) ?? response;
    const requiresReference = instruction.requireValidationRef === true;
    const validationReference = optionalString(instruction.validationReference);
    const customerName =
      optionalString(response.customerName) ??
      optionalString(instruction.customerName);
    if (requiresReference && !validationReference)
      throw new Error("MONNIFY_VALIDATION_REFERENCE_MISSING");
    return {
      ...(customerName ? { customerName } : {}),
      ...(validationReference
        ? { providerReference: validationReference }
        : {}),
      evidence: response,
    };
  }

  async fulfil(input: {
    transactionId: string;
    productCode: string;
    customerIdentifier: string;
    amountMinor: string;
    idempotencyKey: string;
    validationReference?: string;
  }): Promise<BillFulfilment> {
    const vendReference = `PARC-${input.transactionId}`;
    const fields = [
      `"productCode":${JSON.stringify(input.productCode)}`,
      `"customerId":${JSON.stringify(input.customerIdentifier)}`,
      `"vendAmount":${minorUnitsToMajorJsonNumber(input.amountMinor)}`,
      `"vendReference":${JSON.stringify(vendReference)}`,
    ];
    if (input.validationReference)
      fields.push(
        `"validationReference":${JSON.stringify(input.validationReference)}`,
      );
    const envelope = await this.request("/api/v1/vas/bills-payment/vend", {
      method: "POST",
      body: `{${fields.join(",")}}`,
    });
    return mapFulfilment(requiredBody(envelope), vendReference);
  }

  async inquire(providerReference: string): Promise<BillFulfilment> {
    const path = `/api/v1/vas/bills-payment/requery?vendReference=${encodeURIComponent(providerReference)}`;
    const envelope = await this.request(path, { method: "GET" });
    return mapFulfilment(requiredBody(envelope), providerReference);
  }

  private async request(
    path: string,
    init: { method: "GET" | "POST"; body?: string },
  ): Promise<MonnifyEnvelope> {
    const token = await this.accessToken();
    const response = await this.http(new URL(path, this.baseUrl), {
      method: init.method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      ...(init.body ? { body: init.body } : {}),
    });
    const envelope = (await response.json()) as MonnifyEnvelope;
    if (!response.ok || envelope.requestSuccessful === false)
      throw new Error(`MONNIFY_REQUEST_FAILED_${response.status}`);
    return envelope;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now() + 30_000)
      return this.token.value;
    const basic = Buffer.from(`${this.apiKey}:${this.clientSecret}`).toString(
      "base64",
    );
    const response = await this.http(
      new URL("/api/v1/auth/login", this.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Basic ${basic}`,
          accept: "application/json",
        },
      },
    );
    const envelope = (await response.json()) as MonnifyEnvelope;
    const body = requiredBody(envelope);
    const value = optionalString(body.accessToken);
    if (!response.ok || envelope.requestSuccessful === false || !value)
      throw new Error(`MONNIFY_AUTH_FAILED_${response.status}`);
    const expiresIn = positiveInteger(body.expiresIn) ?? 3_600;
    this.token = { value, expiresAt: this.now() + expiresIn * 1_000 };
    return value;
  }
}

function requiredBody(envelope: MonnifyEnvelope): Record<string, unknown> {
  if (!envelope.responseBody || typeof envelope.responseBody !== "object")
    throw new Error("MONNIFY_RESPONSE_BODY_MISSING");
  return envelope.responseBody;
}

function mapFulfilment(
  body: Record<string, unknown>,
  fallbackReference: string,
): BillFulfilment {
  const status = optionalString(body.vendStatus)?.toUpperCase();
  const state =
    status === "SUCCESS" || status === "SUCCESSFUL"
      ? "SUCCESS"
      : status === "FAILED"
        ? "FAILED"
        : status === "IN_PROGRESS" || status === "PENDING"
          ? "PENDING"
          : undefined;
  if (!state) throw new Error("MONNIFY_VEND_STATUS_UNKNOWN");
  const receipt =
    optionalString(body.receipt) ?? optionalString(body.paymentReceipt);
  const token = optionalString(body.token);
  return {
    providerReference: optionalString(body.vendReference) ?? fallbackReference,
    state,
    ...(receipt ? { receipt } : {}),
    ...(token ? { token } : {}),
  };
}

function minorUnitsToMajorJsonNumber(value: string): string {
  if (!/^[1-9]\d*$/.test(value)) throw new Error("MONNIFY_AMOUNT_INVALID");
  const padded = value.padStart(3, "0");
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}
