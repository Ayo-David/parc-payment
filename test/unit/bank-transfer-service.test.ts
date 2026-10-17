import { jest } from "@jest/globals";
import type { Knex } from "knex";
import {
  BankTransferService,
  TRANSFER_FEE_REVENUE_PURPOSE,
} from "../../src/services/bank-transfer-service.js";
import type { ExternalTransferService } from "../../src/services/external-transfer-service.js";
import {
  ProviderRejectedError,
  type TransferDirectoryProvider,
} from "../../src/services/payment-provider.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const otherCustomerId = "33333333-3333-4333-8333-333333333333";
const walletId = "44444444-4444-4444-8444-444444444444";
const settlementId = "55555555-5555-4555-8555-555555555555";
const feeRevenueId = "66666666-6666-4666-8666-666666666666";

/** Just enough of Knex for where/first/insert over in-memory tables. */
function fakeDb() {
  type Row = Record<string, unknown>;
  const tables: {
    payment_transfer_name_enquiries: Row[];
    payment_transfer_quotes: Row[];
    payment_external_transfers: Row[];
  } = {
    payment_transfer_name_enquiries: [],
    payment_transfer_quotes: [],
    payment_external_transfers: [],
  };
  const tx = Object.assign(
    (table: keyof typeof tables) => {
      let filter: Record<string, unknown> = {};
      const builder = {
        where: (values: Record<string, unknown>) => {
          filter = values;
          return builder;
        },
        first: async () =>
          tables[table].find((row) =>
            Object.entries(filter).every(([key, value]) => row[key] === value),
          ),
        insert: async (row: Record<string, unknown>) => {
          tables[table].push(row);
        },
      };
      return builder;
    },
    { raw: async () => undefined },
  );
  const db = {
    transaction: async (work: (trx: unknown) => Promise<unknown>) => work(tx),
  } as unknown as Knex;
  return { db, tables };
}

function setup(policy = { flatFeeMinor: "5000", maxAmountMinor: "100000000" }) {
  const { db, tables } = fakeDb();
  const nameEnquiry = jest.fn<TransferDirectoryProvider["nameEnquiry"]>(
    async () => ({ accountName: "ADA LOVELACE", recipientCode: "RCP_test" }),
  );
  const provider = {
    code: "PAYSTACK",
    supports: () => true,
    submit: async () => {
      throw new Error("not used");
    },
    inquire: async () => {
      throw new Error("not used");
    },
    listBanks: async () => [],
    nameEnquiry,
  } satisfies TransferDirectoryProvider;
  const select = jest.fn(async () => ({
    provider,
    decisionId: "77777777-7777-4777-8777-777777777777",
    replayed: false,
  }));
  const initiate = jest.fn<ExternalTransferService["initiate"]>(async () => ({
    id: "88888888-8888-4888-8888-888888888888",
    paymentId: "99999999-9999-4999-8999-999999999999",
    status: "PENDING",
    replayed: false,
  }));
  const provisionTenantAccount = jest.fn(async (input: { purpose: string }) =>
    input.purpose === TRANSFER_FEE_REVENUE_PURPOSE
      ? feeRevenueId
      : settlementId,
  );
  const service = new BankTransferService(
    db,
    { select } as never,
    { initiate },
    { provisionTenantAccount },
    policy,
  );
  return { service, tables, nameEnquiry, initiate, provisionTenantAccount };
}

const enquire = (
  service: BankTransferService,
  idempotencyKey = "enq-1",
  accountNumber = "0123456789",
) =>
  service.enquire({
    tenantId,
    customerId,
    bankCode: "058",
    accountNumber,
    idempotencyKey,
    correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });

const quote = (
  service: BankTransferService,
  enquiryToken: string,
  amountMinor = "250000",
  options: { idempotencyKey?: string; customer?: string } = {},
) =>
  service.quote({
    tenantId,
    customerId: options.customer ?? customerId,
    enquiryToken,
    amountMinor,
    currency: "NGN",
    idempotencyKey: options.idempotencyKey ?? "quote-1",
  });

const submit = (
  service: BankTransferService,
  quoteId: string,
  overrides: Partial<Parameters<BankTransferService["submit"]>[0]> = {},
) =>
  service.submit({
    tenantId,
    customerId,
    quoteId,
    sourceAccountId: walletId,
    bankCode: "058",
    accountNumber: "0123456789",
    amountMinor: "250000",
    currency: "NGN",
    narration: "Rent",
    idempotencyKey: "transfer-1",
    correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ...overrides,
  });

describe("customer bank transfers", () => {
  it("verifies the account once per idempotency key", async () => {
    const { service, nameEnquiry } = setup();
    const first = await enquire(service);
    expect(first).toMatchObject({
      account_name: "ADA LOVELACE",
      account_number: "0123456789",
      bank_code: "058",
      replayed: false,
    });
    expect(first.enquiry_token).toMatch(/^[0-9a-f-]{36}$/);
    await expect(enquire(service)).resolves.toMatchObject({
      enquiry_token: first.enquiry_token,
      replayed: true,
    });
    expect(nameEnquiry).toHaveBeenCalledTimes(1);
    await expect(enquire(service, "enq-1", "9999999999")).rejects.toThrow(
      "IDEMPOTENCY_KEY_REUSED",
    );
  });

  it("reports an account the provider can't resolve as a customer error", async () => {
    const { service, nameEnquiry } = setup();
    nameEnquiry.mockRejectedValueOnce(new ProviderRejectedError("422"));
    await expect(enquire(service)).rejects.toThrow("ACCOUNT_RESOLUTION_FAILED");
  });

  it("quotes the flat fee on top of the amount", async () => {
    const { service } = setup();
    const { enquiry_token } = await enquire(service);
    await expect(quote(service, enquiry_token)).resolves.toMatchObject({
      amount_minor: "250000",
      fee_minor: "5000",
      total_debit_minor: "255000",
      account_name: "ADA LOVELACE",
      narration: "Transfer to ADA LOVELACE",
      replayed: false,
    });
  });

  it("refuses amounts over the limit, expired enquiries and other customers' tokens", async () => {
    const { service, tables } = setup({
      flatFeeMinor: "0",
      maxAmountMinor: "100000",
    });
    const { enquiry_token } = await enquire(service);
    await expect(quote(service, enquiry_token, "100001")).rejects.toThrow(
      "TRANSFER_LIMIT_EXCEEDED",
    );
    await expect(
      quote(service, enquiry_token, "1000", { customer: otherCustomerId }),
    ).rejects.toThrow("TRANSFER_ENQUIRY_NOT_FOUND");
    tables.payment_transfer_name_enquiries[0]!.expires_at = new Date(0);
    await expect(quote(service, enquiry_token, "1000")).rejects.toThrow(
      "TRANSFER_ENQUIRY_EXPIRED",
    );
  });

  it("submits the quoted amount and fee to the verified recipient", async () => {
    const { service, initiate, provisionTenantAccount } = setup();
    const { enquiry_token } = await enquire(service);
    const { quote_id } = await quote(service, enquiry_token);
    await expect(submit(service, quote_id)).resolves.toEqual({
      id: "88888888-8888-4888-8888-888888888888",
      status: "PENDING",
      amount_minor: "250000",
      fee_minor: "5000",
      total_debit_minor: "255000",
      currency: "NGN",
      provider: "PAYSTACK",
      replayed: false,
    });
    expect(provisionTenantAccount).toHaveBeenCalledWith({
      tenantId,
      purpose: "PAYSTACK_SETTLEMENT",
      accountType: "ASSET",
    });
    expect(initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAccountId: walletId,
        settlementLedgerAccountId: settlementId,
        beneficiaryName: "ADA LOVELACE",
        destinationAccountNumber: "0123456789",
        destinationBankCode: "058",
        amountMinor: "250000",
        requiredProvider: "PAYSTACK",
        providerData: { recipientCode: "RCP_test", narration: "Rent" },
        quoteId: quote_id,
        feeMinor: "5000",
        feeLedgerAccountId: feeRevenueId,
      }),
    );
  });

  it("books no fee account when the fee is zero", async () => {
    const { service, initiate, provisionTenantAccount } = setup({
      flatFeeMinor: "0",
      maxAmountMinor: "100000000",
    });
    const { enquiry_token } = await enquire(service);
    const { quote_id } = await quote(service, enquiry_token);
    await submit(service, quote_id);
    expect(provisionTenantAccount).toHaveBeenCalledTimes(1);
    expect(initiate.mock.calls[0]?.[0]).not.toHaveProperty(
      "feeLedgerAccountId",
    );
  });

  it("rejects a submission that doesn't match its quote", async () => {
    const { service, initiate } = setup();
    const { enquiry_token } = await enquire(service);
    const { quote_id } = await quote(service, enquiry_token);
    await expect(
      submit(service, quote_id, { amountMinor: "250001" }),
    ).rejects.toThrow("TRANSFER_QUOTE_MISMATCH");
    await expect(
      submit(service, quote_id, { accountNumber: "9999999999" }),
    ).rejects.toThrow("TRANSFER_QUOTE_MISMATCH");
    expect(initiate).not.toHaveBeenCalled();
  });

  it("refuses an expired quote unless the submission is a replay", async () => {
    const { service, tables, initiate } = setup();
    const { enquiry_token } = await enquire(service);
    const { quote_id } = await quote(service, enquiry_token);
    tables.payment_transfer_quotes[0]!.expires_at = new Date(0);
    await expect(submit(service, quote_id)).rejects.toThrow(
      "TRANSFER_QUOTE_EXPIRED",
    );
    tables.payment_external_transfers.push({
      tenant_id: tenantId,
      idempotency_key: "transfer-1",
      id: "88888888-8888-4888-8888-888888888888",
    });
    await submit(service, quote_id);
    expect(initiate).toHaveBeenCalledTimes(1);
  });
});
