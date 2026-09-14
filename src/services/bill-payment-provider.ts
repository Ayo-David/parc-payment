export interface BillCustomerValidation {
  customerName?: string;
  providerReference?: string;
  evidence: unknown;
}
export interface BillFulfilment {
  providerReference: string;
  state: "PENDING" | "SUCCESS" | "FAILED";
  receipt?: string;
  token?: string;
}
export interface BillPaymentProvider {
  readonly code: string;
  validateCustomer(input: {
    productCode: string;
    customerIdentifier: string;
  }): Promise<BillCustomerValidation>;
  fulfil(input: {
    transactionId: string;
    productCode: string;
    customerIdentifier: string;
    amountMinor: string;
    idempotencyKey: string;
    validationReference?: string;
  }): Promise<BillFulfilment>;
  inquire(providerReference: string): Promise<BillFulfilment>;
}
export class BillPaymentProviderRegistry {
  private readonly providers = new Map<string, BillPaymentProvider>();
  register(provider: BillPaymentProvider): void {
    if (this.providers.has(provider.code))
      throw new Error(`Bill provider ${provider.code} already registered`);
    this.providers.set(provider.code, provider);
  }
  require(code: string): BillPaymentProvider {
    const provider = this.providers.get(code);
    if (!provider)
      throw new Error(
        "Resolved bill provider is unavailable in this deployment",
      );
    return provider;
  }
}

/** Test/development only. Never advertise this adapter in a production capability catalogue. */
export class SandboxBillPaymentProvider implements BillPaymentProvider {
  readonly code = "SANDBOX_BILLS";
  async validateCustomer(input: {
    productCode: string;
    customerIdentifier: string;
  }): Promise<BillCustomerValidation> {
    return {
      customerName: "Sandbox Customer",
      providerReference: `VAL-${input.productCode}-${input.customerIdentifier}`,
      evidence: { sandbox: true },
    };
  }
  async fulfil(input: { transactionId: string }): Promise<BillFulfilment> {
    return {
      providerReference: `BILL-${input.transactionId}`,
      state: "SUCCESS",
      receipt: `RCT-${input.transactionId}`,
    };
  }
  async inquire(providerReference: string): Promise<BillFulfilment> {
    return { providerReference, state: "SUCCESS" };
  }
}
