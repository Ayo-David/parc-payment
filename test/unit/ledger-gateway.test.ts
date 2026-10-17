import { jest } from "@jest/globals";
import { HttpLedgerPostingGateway } from "../../src/services/ledger-gateway.js";

describe("HttpLedgerPostingGateway", () => {
  it("authenticates to Ledger with a Bearer service credential", async () => {
    const http = jest.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json(
          { transaction_id: "tx-1", replayed: false },
          { status: 201 },
        ),
      ),
    );
    await new HttpLedgerPostingGateway(
      "http://ledger.test",
      {
        authorization: () =>
          Promise.resolve("Bearer payment-ledger-token-0123456789"),
      },
      http,
    ).post({
      tenantId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "collection-1",
      reference: "COLLECTION-1",
      currency: "NGN",
      debitAccountId: "debit-account",
      creditAccountId: "credit-account",
      amountMinor: "1000",
    });
    const headers = new Headers(http.mock.calls[0]![1]?.headers);
    expect(headers.get("authorization")).toBe(
      "Bearer payment-ledger-token-0123456789",
    );
    expect(headers.get("x-calling-service")).toBe("parc-payment");
    expect(headers.get("x-internal-service-token")).toBeNull();
  });
  const gateway = (http: typeof fetch) =>
    new HttpLedgerPostingGateway(
      "http://ledger.test",
      { authorization: () => Promise.resolve("Bearer token") },
      http,
    );

  it("captures a transfer fee as a third leg from the same held debit", async () => {
    const http = jest.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({ transaction_id: "tx-1", replayed: false }),
      ),
    );
    await gateway(http).captureHold({
      tenantId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "external-transfer:t-1:capture",
      holdId: "hold-1",
      reference: "EXT-t-1",
      sourceAccountId: "wallet",
      destinationAccountId: "settlement",
      amountMinor: "250000",
      feeMinor: "5000",
      feeAccountId: "fee-revenue",
    });
    expect(JSON.parse(String(http.mock.calls[0]![1]?.body))).toEqual({
      reference: "EXT-t-1",
      entries: [
        { account_id: "wallet", direction: "DEBIT", amount_minor: "255000" },
        {
          account_id: "settlement",
          direction: "CREDIT",
          amount_minor: "250000",
        },
        {
          account_id: "fee-revenue",
          direction: "CREDIT",
          amount_minor: "5000",
        },
      ],
    });
  });

  it("reports a hold refused for balance as INSUFFICIENT_FUNDS", async () => {
    const http = jest.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json(
          { code: "INSUFFICIENT_AVAILABLE_BALANCE" },
          { status: 422 },
        ),
      ),
    );
    await expect(
      gateway(http).createHold({
        tenantId: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "external-transfer:t-1:hold",
        accountId: "wallet",
        amountMinor: "255000",
        currency: "NGN",
        purpose: "EXTERNAL_TRANSFER",
        expiresAt: "2026-10-18T00:00:00.000Z",
      }),
    ).rejects.toThrow("INSUFFICIENT_FUNDS");
  });
});
