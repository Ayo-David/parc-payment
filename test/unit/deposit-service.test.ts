import { createHmac } from "node:crypto";
import { jest } from "@jest/globals";
import type { Knex } from "knex";
import {
  DepositService,
  isDedicatedAccountDeposit,
  PAYSTACK_FEES_PURPOSE,
  PAYSTACK_SETTLEMENT_PURPOSE,
} from "../../src/services/deposit-service.js";
import { PaystackProvider } from "../../src/services/paystack-provider.js";
import { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const walletId = "44444444-4444-4444-8444-444444444444";
const settlementId = "55555555-5555-4555-8555-555555555555";
const feesId = "77777777-7777-4777-8777-777777777777";
const payloadHash = "a".repeat(64);

const charge = {
  id: 3001,
  status: "success",
  reference: "T-dva-1",
  amount: 250000,
  currency: "NGN",
  channel: "dedicated_nuban",
  paid_at: "2026-10-15T10:00:00.000Z",
  authorization: {
    channel: "dedicated_nuban",
    receiver_bank_account_number: "9930000001",
    receiver_bank: "Test Bank",
  },
};

function setup(options?: {
  account?: boolean;
  verified?: {
    status: string;
    amountMinor: string;
    feesMinor: string;
    currency: string;
  };
}) {
  const db = {
    raw: jest.fn(async () => ({
      rows:
        options?.account === false
          ? []
          : [
              {
                tenant_id: tenantId,
                financial_account_id: "66666666-6666-4666-8666-666666666666",
                ledger_account_id: walletId,
              },
            ],
    })),
  } as unknown as Knex;
  const verifyCharge = jest.fn(
    async () =>
      options?.verified ?? {
        status: "success",
        amountMinor: "250000",
        feesMinor: "2500",
        currency: "NGN",
      },
  );
  const provisionTenantAccount = jest.fn(async (input: { purpose: string }) =>
    input.purpose === PAYSTACK_FEES_PURPOSE ? feesId : settlementId,
  );
  const post = jest.fn(async () => ({ transactionId: "t", replayed: false }));
  const confirm = jest.fn(async () => ({
    collectionId: "c",
    paymentId: "p",
    status: "POSTED",
    replayed: false,
  }));
  return {
    service: new DepositService(
      db,
      { verifyCharge },
      { provisionTenantAccount, post },
      { confirm },
    ),
    verifyCharge,
    provisionTenantAccount,
    post,
    confirm,
  };
}

describe("dedicated account deposits", () => {
  it("credits the wallet from the settlement account with Paystack's verified amount", async () => {
    const { service, confirm, provisionTenantAccount } = setup();
    await expect(
      service.applyCharge({ data: charge, webhookId: "w-1", payloadHash }),
    ).resolves.toBe(true);
    expect(provisionTenantAccount).toHaveBeenCalledWith({
      tenantId,
      purpose: PAYSTACK_SETTLEMENT_PURPOSE,
      accountType: "ASSET",
    });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        providerCode: "PAYSTACK",
        providerReference: "T-dva-1",
        providerAccountNumber: "9930000001",
        amountMinor: "250000",
        currency: "NGN",
        webhookId: "w-1",
        payloadHash,
        debitLedgerAccountId: settlementId,
        creditLedgerAccountId: walletId,
      }),
    );
  });

  it("books Paystack's fee to the tenant, leaving the customer's credit whole", async () => {
    const { service, post, confirm } = setup();
    await service.applyCharge({ data: charge, webhookId: "w-1", payloadHash });
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinor: "250000" }),
    );
    expect(post).toHaveBeenCalledWith({
      tenantId,
      idempotencyKey: "collection-fee:PAYSTACK:T-dva-1",
      reference: "T-dva-1-FEE",
      currency: "NGN",
      debitAccountId: feesId,
      creditAccountId: settlementId,
      amountMinor: "2500",
    });
  });

  it("skips the fee posting when Paystack charged nothing", async () => {
    const { service, post } = setup({
      verified: {
        status: "success",
        amountMinor: "250000",
        feesMinor: "0",
        currency: "NGN",
      },
    });
    await service.applyCharge({ data: charge, webhookId: "w-1", payloadHash });
    expect(post).not.toHaveBeenCalled();
  });

  it("provisions each tenant ledger account once", async () => {
    const { service, provisionTenantAccount } = setup();
    await service.applyCharge({ data: charge, webhookId: "w-1", payloadHash });
    await service.applyCharge({
      data: { ...charge, reference: "T-dva-2" },
      webhookId: "w-2",
      payloadHash,
    });
    // Settlement and fee accounts, each provisioned only on first use.
    expect(provisionTenantAccount).toHaveBeenCalledTimes(2);
  });

  it("refuses to credit when Paystack's record disagrees with the webhook", async () => {
    const { service, confirm } = setup({
      verified: {
        status: "success",
        amountMinor: "999999",
        feesMinor: "0",
        currency: "NGN",
      },
    });
    await expect(
      service.applyCharge({ data: charge, webhookId: "w-1", payloadHash }),
    ).rejects.toThrow("does not match");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("refuses to credit a charge Paystack hasn't confirmed", async () => {
    const { service, confirm } = setup({
      verified: {
        status: "abandoned",
        amountMinor: "250000",
        feesMinor: "0",
        currency: "NGN",
      },
    });
    await expect(
      service.applyCharge({ data: charge, webhookId: "w-1", payloadHash }),
    ).rejects.toThrow("not confirmed");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("ignores deposits into an account that isn't ours", async () => {
    const { service, verifyCharge, confirm } = setup({ account: false });
    await expect(
      service.applyCharge({ data: charge, webhookId: "w-1", payloadHash }),
    ).resolves.toBe(false);
    expect(verifyCharge).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("only treats dedicated-account charges as deposits", () => {
    expect(isDedicatedAccountDeposit("charge.success", charge)).toBe(true);
    expect(
      isDedicatedAccountDeposit("charge.success", {
        ...charge,
        channel: "card",
        authorization: { channel: "card" },
      }),
    ).toBe(false);
    expect(isDedicatedAccountDeposit("transfer.success", charge)).toBe(false);
  });
});

describe("Paystack webhook intake for deposits", () => {
  const secret = "sk_test_synthetic_secret";
  const db = {
    raw: jest.fn(async () => ({
      rows: [{ webhook_id: "webhook-1", replayed: false }],
    })),
  } as unknown as Knex;

  it("applies a verified dedicated-account charge", async () => {
    const applyCharge = jest.fn(async () => true);
    const service = new PaystackWebhookService(
      db,
      secret,
      "default",
      undefined,
      { applyCharge },
    );
    const body = Buffer.from(
      JSON.stringify({ event: "charge.success", data: charge }),
    );
    await service.receive(
      body,
      createHmac("sha512", secret).update(body).digest("hex"),
    );
    expect(applyCharge).toHaveBeenCalledWith(
      expect.objectContaining({ data: charge, webhookId: "webhook-1" }),
    );
  });

  it("asks Paystack to retry when crediting fails", async () => {
    const service = new PaystackWebhookService(
      db,
      secret,
      "default",
      undefined,
      { applyCharge: () => Promise.reject(new Error("ledger down")) },
    );
    const body = Buffer.from(
      JSON.stringify({ event: "charge.success", data: charge }),
    );
    await expect(
      service.receive(
        body,
        createHmac("sha512", secret).update(body).digest("hex"),
      ),
    ).rejects.toThrow("WEBHOOK_PROCESSING_FAILED");
  });
});

describe("Paystack directory and verification", () => {
  it("follows the bank-list cursor across pages", async () => {
    const pages = [
      {
        status: true,
        data: [{ name: "Guaranty Trust Bank", code: "058", active: true }],
        meta: { next: "cursor-2" },
      },
      {
        status: true,
        data: [
          { name: "Old Bank", code: "999", active: true, is_deleted: true },
          { name: "Kuda", code: "50211", active: true },
        ],
        meta: { next: null },
      },
    ];
    const http = jest.fn<typeof fetch>(async () => {
      const page = pages.shift();
      if (!page) throw new Error("Unexpected Paystack call");
      return new Response(JSON.stringify(page), { status: 200 });
    });
    const banks = await new PaystackProvider(
      "sk_test_synthetic",
      "https://api.paystack.co",
      http,
    ).listBanks();
    expect(banks).toEqual([
      { name: "Guaranty Trust Bank", code: "058", active: true },
      { name: "Kuda", code: "50211", active: true },
    ]);
    expect(
      new URL(String(http.mock.calls[1]?.[0])).searchParams.get("next"),
    ).toBe("cursor-2");
  });

  it("verifies a charge by reference", async () => {
    const http = jest.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            status: true,
            data: {
              status: "success",
              amount: 250000,
              fees: 2500,
              currency: "NGN",
            },
          }),
          { status: 200 },
        ),
    );
    await expect(
      new PaystackProvider(
        "sk_test_synthetic",
        "https://api.paystack.co",
        http,
      ).verifyCharge("T-dva-1"),
    ).resolves.toEqual({
      status: "success",
      amountMinor: "250000",
      feesMinor: "2500",
      currency: "NGN",
    });
    expect(String(http.mock.calls[0]?.[0])).toBe(
      "https://api.paystack.co/transaction/verify/T-dva-1",
    );
  });
});
