export type PaymentCapability =
  | "VIRTUAL_ACCOUNT"
  | "COLLECTION"
  | "INTERBANK_TRANSFER"
  | "DIRECT_DEBIT"
  | "BILL_PAYMENT"
  | "SERVICE_PAYOUT";
export interface ProviderSubmission {
  providerReference: string;
  state: "PENDING" | "SUCCESS" | "FAILED";
  providerStatus?: string;
}
export interface ProviderInquiryContext {
  capability?: PaymentCapability;
  amountMinor?: string;
  transactionDate?: string;
  transactionType?: string;
}
export class ProviderOutcomeAmbiguousError extends Error {
  public readonly code = "PROVIDER_OUTCOME_AMBIGUOUS";
}
export interface PaymentProvider {
  readonly code: string;
  supports(capability: PaymentCapability, currency: string): boolean;
  submit(input: {
    operationId: string;
    capability: PaymentCapability;
    currency: string;
    amountMinor: string;
    idempotencyKey: string;
    customerEmail?: string;
    providerData?: unknown;
  }): Promise<ProviderSubmission>;
  inquire(
    providerReference: string,
    context?: ProviderInquiryContext,
  ): Promise<ProviderSubmission>;
}

export interface VirtualAccountResult {
  accountNumber: string;
  providerCustomerReference: string;
  providerAccountReference?: string;
  accountName?: string;
  bankCode?: string;
  bankName?: string;
}

export interface VirtualAccountProvider extends PaymentProvider {
  createVirtualAccount(input: unknown): Promise<VirtualAccountResult>;
}
/** The customer a dedicated virtual account is opened for (their legal name). */
export interface VirtualAccountHolder {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
}

/**
 * Providers that validate the customer's BVN against a bank account they own
 * and then open the dedicated account asynchronously, reporting the result by
 * webhook (Paystack's "assign" flow). The BVN and bank account are passed
 * straight through and never stored.
 */
export interface AssignableVirtualAccountProvider extends PaymentProvider {
  assignVirtualAccount(input: {
    holder: VirtualAccountHolder;
    bvn: string;
    bankCode: string;
    accountNumber: string;
  }): Promise<void>;
}

export function canAssignVirtualAccounts(
  provider: PaymentProvider,
): provider is AssignableVirtualAccountProvider {
  return "assignVirtualAccount" in provider;
}

/** The provider declined the request outright; `message` is safe to show the customer. */
export class ProviderRejectedError extends Error {
  public readonly code = "PROVIDER_REJECTED";
}

export interface TransferDirectoryProvider extends PaymentProvider {
  listBanks(): Promise<Array<{ name: string; code: string; active: boolean }>>;
  nameEnquiry(input: { accountNumber: string; bankCode: string }): Promise<{
    accountName: string;
    recipientCode?: string;
    sessionId?: string;
    kycLevel?: string;
  }>;
}
export class ProviderRegistry {
  private readonly providers = new Map<string, PaymentProvider>();
  public register(provider: PaymentProvider): void {
    if (this.providers.has(provider.code))
      throw new Error(`Provider ${provider.code} already registered`);
    this.providers.set(provider.code, provider);
  }
  public require(
    code: string,
    capability: PaymentCapability,
    currency: string,
  ): PaymentProvider {
    const provider = this.providers.get(code);
    if (!provider?.supports(capability, currency))
      throw new Error(
        "Resolved provider is unavailable in this Payment deployment",
      );
    return provider;
  }
}
