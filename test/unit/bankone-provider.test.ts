import { jest } from "@jest/globals";
import { BankOneProvider } from "../../src/services/bankone-provider.js";
import { ProviderOutcomeAmbiguousError } from "../../src/services/payment-provider.js";

const account = {
  transactionTrackingReference: "track-1",
  accountOpeningTrackingReference: "opening-1",
  productCode: "SAVINGS",
  firstName: "Ada",
  lastName: "Test",
  phoneNumber: "08000000000",
  email: "ada@example.invalid",
  dateOfBirth: "1990-01-01",
  address: "Synthetic address",
  gender: "Female",
  bvn: "22222222222",
  nin: "11111111111",
  nextOfKinPhoneNumber: "08000000009",
  nextOfKinName: "Synthetic Kin",
  accountOfficerCode: "OFFICER-1",
  accountTier: 3,
  hasSufficientAccountInformation: true,
};

const transfer = {
  sourceAccountNumber: "1000000001",
  payerName: "Ada Test",
  destinationBankCode: "999999",
  destinationAccountNumber: "1000000002",
  destinationAccountName: "Test Receiver",
  destinationPhoneNumber: "08000000001",
  destinationAccountType: "10",
  destinationKycLevel: "3",
  destinationBvn: "33333333333",
  nipSessionId: "synthetic-session",
  narration: "Synthetic transfer",
};

function provider(http: typeof fetch): BankOneProvider {
  return new BankOneProvider(
    "synthetic-token",
    "synthetic-appzone-account",
    "https://staging.mybankone.com",
    "https://staging.mybankone.com",
    http,
  );
}

describe("BankOne provider adapter", () => {
  it("submits exact minor units with a deterministic 12-character reference", async () => {
    const http = jest.fn(
      async () =>
        new Response(
          JSON.stringify({ ResponseCode: "91", Status: "Pending" }),
          {
            status: 200,
          },
        ),
    ) as jest.MockedFunction<typeof fetch>;
    await expect(
      provider(http).submit({
        operationId: "95e88762-7990-47ee-8576-9972403aff3e",
        capability: "INTERBANK_TRANSFER",
        currency: "NGN",
        amountMinor: "12500",
        idempotencyKey: "idem-1",
        providerData: transfer,
      }),
    ).resolves.toMatchObject({ state: "PENDING" });
    const body = JSON.parse(String(http.mock.calls[0]?.[1]?.body));
    expect(body.Amount).toBe("12500");
    expect(body.TransactionReference).toMatch(/^[A-F0-9]{12}$/);
  });

  it("treats a transport failure after submission as ambiguous", async () => {
    const http = jest.fn(async () => {
      throw new Error("timeout");
    }) as jest.MockedFunction<typeof fetch>;
    await expect(
      provider(http).submit({
        operationId: "operation-2",
        capability: "INTERBANK_TRANSFER",
        currency: "NGN",
        amountMinor: "1",
        idempotencyKey: "idem-2",
        providerData: transfer,
      }),
    ).rejects.toBeInstanceOf(ProviderOutcomeAmbiguousError);
  });

  it("creates a BankOne deposit account only from complete transient KYC input", async () => {
    const http = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            Payload: {
              AccountNumber: "1000000003",
              CustomerID: "customer-1",
            },
            IsSuccessful: true,
          }),
          { status: 200 },
        ),
    ) as jest.MockedFunction<typeof fetch>;
    await expect(provider(http).createVirtualAccount(account)).resolves.toEqual(
      {
        accountNumber: "1000000003",
        providerCustomerReference: "customer-1",
      },
    );
    const request = JSON.parse(String(http.mock.calls[0]?.[1]?.body));
    expect(request).toMatchObject({
      BVN: account.bvn,
      NationalIdentityNo: account.nin,
      AccountTier: 3,
    });
    expect(String(http.mock.calls[0]?.[0])).toContain(
      "/Account/CreateCustomerAndAccount/2",
    );
    expect(String(http.mock.calls[0]?.[0])).toContain(
      "authtoken=synthetic-token",
    );
  });

  it("returns name-enquiry routing data without exposing the provider BVN", async () => {
    const http = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            Name: "SYNTHETIC RECEIVER",
            BVN: "99999999999",
            KYC: "3",
            SessionID: "session-1",
            IsSuccessful: true,
          }),
          { status: 200 },
        ),
    ) as jest.MockedFunction<typeof fetch>;
    const result = await provider(http).nameEnquiry({
      accountNumber: "1000000002",
      bankCode: "999999",
    });
    expect(result).toEqual({
      accountName: "SYNTHETIC RECEIVER",
      kycLevel: "3",
      sessionId: "session-1",
    });
    expect(result).not.toHaveProperty("bvn");
  });
});
