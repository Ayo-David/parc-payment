import { jest } from "@jest/globals";
import { MonnifyBillPaymentProvider } from "../../src/services/monnify-bill-payment-provider.js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("MonnifyBillPaymentProvider", () => {
  it("authenticates once, validates, and vends an exact major-unit JSON number", async () => {
    const calls: Array<{ url: URL; init?: RequestInit }> = [];
    const http = jest.fn(
      async (resource: URL | RequestInfo, init?: RequestInit) => {
        const url = new URL(resource.toString());
        calls.push({ url, ...(init ? { init } : {}) });
        if (url.pathname === "/api/v1/auth/login")
          return json({
            requestSuccessful: true,
            responseBody: { accessToken: "access-token", expiresIn: 3600 },
          });
        if (url.pathname.endsWith("validate-customer"))
          return json({
            requestSuccessful: true,
            responseBody: {
              customerName: "Ada Customer",
              requireValidationRef: true,
              validationReference: "VALIDATION-1",
            },
          });
        return json({
          requestSuccessful: true,
          responseBody: {
            vendReference: "PARC-transaction-1",
            vendStatus: "SUCCESSFUL",
            token: "1234-5678",
          },
        });
      },
    );
    const provider = new MonnifyBillPaymentProvider(
      "https://sandbox.monnify.com",
      "api-key",
      "client-secret",
      http as typeof fetch,
      () => 1_000,
    );

    await expect(
      provider.validateCustomer({
        productCode: "IKEDC_PREPAID",
        customerIdentifier: "1234567890",
      }),
    ).resolves.toMatchObject({
      customerName: "Ada Customer",
      providerReference: "VALIDATION-1",
    });
    await expect(
      provider.fulfil({
        transactionId: "transaction-1",
        productCode: "IKEDC_PREPAID",
        customerIdentifier: "1234567890",
        amountMinor: "500025",
        idempotencyKey: "ignored-provider-boundary-key",
        validationReference: "VALIDATION-1",
      }),
    ).resolves.toEqual({
      providerReference: "PARC-transaction-1",
      state: "SUCCESS",
      token: "1234-5678",
    });

    expect(http).toHaveBeenCalledTimes(3);
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: `Basic ${Buffer.from("api-key:client-secret").toString("base64")}`,
    });
    expect(calls[2]?.init?.body).toBe(
      '{"productCode":"IKEDC_PREPAID","customerId":"1234567890","vendAmount":5000.25,"vendReference":"PARC-transaction-1","validationReference":"VALIDATION-1"}',
    );
  });

  it("maps IN_PROGRESS requery outcomes to pending", async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          requestSuccessful: true,
          responseBody: { accessToken: "access-token", expiresIn: 3600 },
        }),
      )
      .mockResolvedValueOnce(
        json({
          requestSuccessful: true,
          responseBody: {
            vendReference: "VEND-1",
            vendStatus: "IN_PROGRESS",
          },
        }),
      );
    const provider = new MonnifyBillPaymentProvider(
      "https://sandbox.monnify.com",
      "api-key",
      "client-secret",
      http as typeof fetch,
    );

    await expect(provider.inquire("VEND-1")).resolves.toEqual({
      providerReference: "VEND-1",
      state: "PENDING",
    });
    expect(String(http.mock.calls[1]?.[0])).toContain(
      "/api/v1/vas/bills-payment/requery?vendReference=VEND-1",
    );
  });

  it("rejects a required but missing validation reference", async () => {
    const http = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          requestSuccessful: true,
          responseBody: { accessToken: "access-token", expiresIn: 3600 },
        }),
      )
      .mockResolvedValueOnce(
        json({
          requestSuccessful: true,
          responseBody: { requireValidationRef: true },
        }),
      );
    const provider = new MonnifyBillPaymentProvider(
      "https://sandbox.monnify.com",
      "api-key",
      "client-secret",
      http as typeof fetch,
    );

    await expect(
      provider.validateCustomer({
        productCode: "IKEDC_PREPAID",
        customerIdentifier: "1234567890",
      }),
    ).rejects.toThrow("MONNIFY_VALIDATION_REFERENCE_MISSING");
  });
});
