import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  PaymentProvider,
  ProviderInquiryContext,
  ProviderSubmission,
  VirtualAccountProvider,
  VirtualAccountResult,
} from "./payment-provider.js";
import { ProviderOutcomeAmbiguousError } from "./payment-provider.js";

const transferSchema = z.object({
  sourceAccountNumber: z.string().min(10).max(20),
  payerName: z.string().min(1).max(100),
  destinationBankCode: z.string().min(3).max(10),
  destinationAccountNumber: z.string().min(10).max(20),
  destinationAccountName: z.string().min(1).max(100),
  destinationPhoneNumber: z.string().min(7).max(20),
  destinationAccountType: z.string().min(1).max(30),
  destinationKycLevel: z.string().min(1).max(10),
  destinationBvn: z.string().regex(/^\d{11}$/),
  nipSessionId: z.string().min(1).max(100),
  narration: z.string().min(1).max(100),
});

const accountSchema = z.object({
  transactionTrackingReference: z.string().min(1).max(100),
  accountOpeningTrackingReference: z.string().min(1).max(100),
  productCode: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().min(7).max(20),
  email: z.string().email(),
  dateOfBirth: z.string().date(),
  address: z.string().min(1).max(250),
  gender: z.string().min(1).max(20),
  bvn: z.string().regex(/^\d{11}$/),
  nin: z.string().regex(/^\d{11}$/),
  nextOfKinPhoneNumber: z.string().min(7).max(20),
  nextOfKinName: z.string().min(1).max(150),
  accountOfficerCode: z.string().min(1).max(50),
  accountTier: z.number().int().positive(),
  hasSufficientAccountInformation: z.boolean(),
});

export type BankOneTransferData = z.infer<typeof transferSchema>;
export type BankOneAccountData = z.infer<typeof accountSchema>;

export class BankOneProvider
  implements PaymentProvider, VirtualAccountProvider
{
  public readonly code = "BANKONE";

  public constructor(
    private readonly authToken: string,
    private readonly appzoneAccount: string,
    private readonly channelBaseUrl: string,
    private readonly coreBaseUrl: string,
    private readonly http: typeof fetch = fetch,
    private readonly transferPath = "/thirdpartyapiservice/apiservice/Transfer/InterbankTransfer",
    private readonly statusQueryPath = "/thirdpartyapiservice/apiservice/CoreTransactions/TransactionStatusQuery",
    private readonly createAccountPath = "/BankOneWebAPI/api/Account/CreateCustomerAndAccount/2",
  ) {
    for (const value of [channelBaseUrl, coreBaseUrl]) {
      if (new URL(value).protocol !== "https:")
        throw new Error("BankOne endpoints must use HTTPS");
    }
  }

  public supports(capability: string, currency: string): boolean {
    return (
      currency === "NGN" &&
      (capability === "INTERBANK_TRANSFER" || capability === "VIRTUAL_ACCOUNT")
    );
  }

  public async submit(input: {
    operationId: string;
    capability:
      "VIRTUAL_ACCOUNT" | "COLLECTION" | "INTERBANK_TRANSFER" | "DIRECT_DEBIT";
    currency: string;
    amountMinor: string;
    idempotencyKey: string;
    providerData?: unknown;
  }): Promise<ProviderSubmission> {
    if (
      !this.supports(input.capability, input.currency) ||
      input.capability !== "INTERBANK_TRANSFER"
    )
      throw new Error(
        "BankOne submission supports NGN interbank transfers only",
      );
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Amount must be positive integer minor units");
    const data = transferSchema.parse(input.providerData);
    const reference = compactReference(input.operationId);
    const body = {
      Amount: input.amountMinor,
      AppzoneAccount: this.appzoneAccount,
      Token: this.authToken,
      PayerAccountNumber: data.sourceAccountNumber,
      Payer: data.payerName,
      RecieversBankCode: data.destinationBankCode,
      ReceiverAccountNumber: data.destinationAccountNumber,
      ReceiverName: data.destinationAccountName,
      ReceiverPhoneNumber: data.destinationPhoneNumber,
      ReceiverAccountType: data.destinationAccountType,
      ReceiverKYC: data.destinationKycLevel,
      ReceiverBVN: data.destinationBvn,
      TransactionReference: reference,
      Narration: data.narration,
      NIPSessionID: data.nipSessionId,
    };
    let response: Response;
    try {
      response = await this.post(this.channelBaseUrl, this.transferPath, body);
    } catch (error) {
      throw new ProviderOutcomeAmbiguousError(
        `BankOne transfer outcome is ambiguous: ${error instanceof Error ? error.message : "transport failure"}`,
      );
    }
    return mapOutcome(await jsonBody(response), reference, response.ok);
  }

  public async inquire(
    providerReference: string,
    context?: ProviderInquiryContext,
  ): Promise<ProviderSubmission> {
    if (
      !context?.amountMinor ||
      !context.transactionDate ||
      !context.transactionType
    )
      throw new Error(
        "BankOne inquiry requires amount, date and transaction type",
      );
    const response = await this.post(
      this.channelBaseUrl,
      this.statusQueryPath,
      {
        RetrievalReference: providerReference,
        TransactionDate: context.transactionDate,
        TransactionType: context.transactionType,
        Amount: context.amountMinor,
        Token: this.authToken,
      },
    );
    return mapOutcome(await jsonBody(response), providerReference, response.ok);
  }

  public async createVirtualAccount(
    input: unknown,
  ): Promise<VirtualAccountResult> {
    const data = accountSchema.parse(input);
    const url = new URL(this.createAccountPath, this.coreBaseUrl);
    url.searchParams.set("authtoken", this.authToken);
    const response = await this.http(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        TransactionTrackingRef: data.transactionTrackingReference,
        AccountOpeningTrackingRef: data.accountOpeningTrackingReference,
        ProductCode: data.productCode,
        FirstName: data.firstName,
        LastName: data.lastName,
        PhoneNo: data.phoneNumber,
        Email: data.email,
        DateOfBirth: data.dateOfBirth,
        Address: data.address,
        Gender: data.gender,
        BVN: data.bvn,
        NationalIdentityNo: data.nin,
        NextOfKinPhoneNo: data.nextOfKinPhoneNumber,
        NextOfKinName: data.nextOfKinName,
        HasSufficientInfoOnAccountInfo: data.hasSufficientAccountInformation,
        AccountOfficerCode: data.accountOfficerCode,
        AccountTier: data.accountTier,
      }),
    });
    const body = await jsonBody(response);
    const payload = recordValue(body, "Payload") ?? body;
    const accountNumber = stringValue(payload, "AccountNumber");
    const customerId = stringValue(payload, "CustomerID", "CustomerId");
    if (!response.ok || !accountNumber || !customerId)
      throw new Error(
        `BankOne account creation failed with ${response.status}`,
      );
    return { accountNumber, providerCustomerReference: customerId };
  }

  public async nameEnquiry(input: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{
    accountName: string;
    kycLevel?: string;
    sessionId?: string;
  }> {
    const parsed = z
      .object({
        accountNumber: z.string().min(10).max(20),
        bankCode: z.string().min(3).max(10),
      })
      .parse(input);
    const response = await this.post(
      this.channelBaseUrl,
      "/thirdpartyapiservice/apiservice/Transfer/NameEnquiry",
      {
        AccountNumber: parsed.accountNumber,
        BankCode: parsed.bankCode,
        Token: this.authToken,
      },
    );
    const body = await jsonBody(response);
    const accountName = stringValue(body, "Name");
    if (!response.ok || body.IsSuccessful !== true || !accountName)
      throw new Error(`BankOne name enquiry failed with ${response.status}`);
    // The response also contains BVN; Payment deliberately does not expose it.
    const kycLevel = stringValue(body, "KYC");
    const sessionId = stringValue(body, "SessionID");
    return {
      accountName,
      ...(kycLevel ? { kycLevel } : {}),
      ...(sessionId ? { sessionId } : {}),
    };
  }

  private post(base: string, path: string, body: object): Promise<Response> {
    return this.http(new URL(path, base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}

function compactReference(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}

async function jsonBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringValue(
  body: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys)
    if (typeof body[key] === "string" && body[key]) return body[key];
  return undefined;
}

function recordValue(
  body: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = body[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function mapOutcome(
  body: Record<string, unknown>,
  fallbackReference: string,
  httpOk: boolean,
): ProviderSubmission {
  const code = stringValue(body, "ResponseCode", "responseCode");
  const status = stringValue(body, "Status", "status") ?? "UNKNOWN";
  const providerReference =
    stringValue(body, "TransactionReference", "Reference", "reference") ??
    fallbackReference;
  const normalized = status.toUpperCase();
  const state =
    httpOk && (code === "00" || normalized.includes("SUCCESS"))
      ? "SUCCESS"
      : code === "91" ||
          code === "06" ||
          normalized.includes("PENDING") ||
          normalized === "UNKNOWN"
        ? "PENDING"
        : "FAILED";
  return { providerReference, state, providerStatus: status };
}
