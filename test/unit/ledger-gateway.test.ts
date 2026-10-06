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
});
