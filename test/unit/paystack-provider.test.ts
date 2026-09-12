import { PaystackProvider } from "../../src/services/paystack-provider.js";
import { jest } from "@jest/globals";
describe("Paystack provider adapter", () => {
  it("sends minor units and maps initialize/verify outcomes", async () => {
    const responses = [
      new Response(
        JSON.stringify({ status: true, data: { reference: "PARC-1" } }),
        { status: 200 },
      ),
      new Response(
        JSON.stringify({
          status: true,
          data: { reference: "PARC-1", status: "success" },
        }),
        { status: 200 },
      ),
    ];
    const http = jest.fn(
      async (...httpArguments: Parameters<typeof fetch>): Promise<Response> => {
        void httpArguments;
        const response = responses.shift();
        if (!response) throw new Error("Unexpected Paystack HTTP call");
        return response;
      },
    );
    const provider = new PaystackProvider(
      "sk_test_synthetic",
      "https://api.paystack.co",
      http,
    );
    await expect(
      provider.submit({
        operationId: "PARC-1",
        capability: "COLLECTION",
        currency: "NGN",
        amountMinor: "12500",
        idempotencyKey: "idem-1",
        customerEmail: "synthetic@example.invalid",
      }),
    ).resolves.toEqual({ providerReference: "PARC-1", state: "PENDING" });
    expect(JSON.parse(String(http.mock.calls[0]?.[1]?.body))).toMatchObject({
      amount: "12500",
      currency: "NGN",
    });
    await expect(provider.inquire("PARC-1")).resolves.toEqual({
      providerReference: "PARC-1",
      state: "SUCCESS",
    });
  });

  it("creates a Paystack customer and dedicated NGN account", async () => {
    const responses = [
      new Response(
        JSON.stringify({
          status: true,
          data: { customer_code: "CUS_synthetic" },
        }),
        { status: 200 },
      ),
      new Response(
        JSON.stringify({
          status: true,
          data: { id: 1234, account_number: "1000000200" },
        }),
        { status: 200 },
      ),
    ];
    const http = jest.fn(async () => responses.shift()!) as jest.MockedFunction<
      typeof fetch
    >;
    const provider = new PaystackProvider(
      "sk_test_synthetic",
      "https://api.paystack.co",
      http,
    );
    await expect(
      provider.createVirtualAccount({
        email: "synthetic@example.invalid",
        firstName: "Ada",
        lastName: "Test",
        phone: "08000000000",
        preferredBank: "titan-paystack",
      }),
    ).resolves.toEqual({
      accountNumber: "1000000200",
      providerCustomerReference: "CUS_synthetic",
      providerAccountReference: "1234",
    });
    expect(String(http.mock.calls[1]?.[0])).toContain("/dedicated_account");
  });

  it("submits an NGN transfer using a provider recipient code", async () => {
    const http = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: true,
            data: { reference: "parc-transfer-reference", status: "pending" },
          }),
          { status: 200 },
        ),
    ) as jest.MockedFunction<typeof fetch>;
    const provider = new PaystackProvider(
      "sk_test_synthetic",
      "https://api.paystack.co",
      http,
    );
    await expect(
      provider.submit({
        operationId: "95e88762-7990-47ee-8576-9972403aff3e",
        capability: "INTERBANK_TRANSFER",
        currency: "NGN",
        amountMinor: "50000",
        idempotencyKey: "transfer-1",
        providerData: {
          recipientCode: "RCP_synthetic",
          narration: "Synthetic transfer",
        },
      }),
    ).resolves.toMatchObject({ state: "PENDING" });
    expect(JSON.parse(String(http.mock.calls[0]?.[1]?.body))).toMatchObject({
      source: "balance",
      amount: "50000",
      recipient: "RCP_synthetic",
      currency: "NGN",
    });
  });
});
