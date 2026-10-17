import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createParcAuth } from "../../src/security/parc-service-auth.js";
import type { BankTransferService } from "../../src/services/bank-transfer-service.js";
import type { CustomerPaymentQueryService } from "../../src/services/customer-payment-query-service.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

describe("customer bank transfer HTTP API", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const customerId = "22222222-2222-4222-8222-222222222222";
  const issuer = "https://auth.parc.invalid";
  let sign: (claims: JWTPayload) => Promise<string>;
  let app: ReturnType<typeof createApp>;
  const transfer = {
    id: "33333333-3333-4333-8333-333333333333",
    status: "PENDING",
    amount_minor: "250000",
    fee_minor: "5000",
    total_debit_minor: "255000",
    currency: "NGN",
    provider: "PAYSTACK",
    replayed: false,
  };
  const bankTransfers = {
    enquire: jest.fn<BankTransferService["enquire"]>(),
    quote: jest.fn<BankTransferService["quote"]>(),
    submit: jest.fn<BankTransferService["submit"]>(async () => transfer),
  };
  const customer = () =>
    sign({
      sub: customerId,
      client_id: "parc-mobile-bff",
      token_use: "delegated",
      tenant_id: tenantId,
      scope: "payment.customer.read payment.customer.write",
      subject_type: "CUSTOMER",
      subject_scope: "TENANT",
      session_id: "66666666-6666-4666-8666-666666666666",
      act: { sub: "parc-mobile-bff" },
    });
  const submission = {
    quote_id: "44444444-4444-4444-8444-444444444444",
    source_account_id: "55555555-5555-4555-8555-555555555555",
    bank_code: "058",
    account_number: "0123456789",
    amount_minor: "250000",
    currency: "NGN",
    narration: "Rent",
  };
  const post = async (path: string, body: object) =>
    request(app)
      .post(path)
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "key-1")
      .send(body);

  beforeAll(async () => {
    const keys = await generateKeyPair("RS256");
    const jwks = createLocalJWKSet({
      keys: [{ ...(await exportJWK(keys.publicKey)), kid: "k1", alg: "RS256" }],
    });
    sign = (claims) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(issuer)
        .setAudience("parc-payment")
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(keys.privateKey);
    app = createApp({} as PaystackWebhookService, {
      access: createParcAuth({ issuer, audience: "parc-payment", keys: jwks }),
      queries: {} as CustomerPaymentQueryService,
      bankTransfers,
    });
  });

  beforeEach(() => jest.clearAllMocks());

  it("accepts a new transfer with 202 and an exact replay with 200", async () => {
    const accepted = await post("/v1/transfers/bank", submission);
    expect(accepted.status).toBe(202);
    expect(bankTransfers.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        customerId,
        quoteId: submission.quote_id,
        idempotencyKey: "key-1",
      }),
    );
    bankTransfers.submit.mockResolvedValueOnce({ ...transfer, replayed: true });
    expect((await post("/v1/transfers/bank", submission)).status).toBe(200);
  });

  it("rejects unknown fields and an over-long narration before the service", async () => {
    expect(
      (await post("/v1/transfers/bank", { ...submission, fee_minor: "0" }))
        .status,
    ).toBe(422);
    expect(
      (
        await post("/v1/transfers/bank", {
          ...submission,
          narration: "x".repeat(101),
        })
      ).status,
    ).toBe(422);
    expect(bankTransfers.submit).not.toHaveBeenCalled();
  });

  it.each([
    ["INSUFFICIENT_FUNDS", 422],
    ["TRANSFER_QUOTE_EXPIRED", 422],
    ["TRANSFER_QUOTE_MISMATCH", 422],
    ["TRANSFER_QUOTE_USED", 409],
    ["TRANSFER_QUOTE_NOT_FOUND", 404],
  ])("maps %s to %i", async (code, status) => {
    bankTransfers.submit.mockRejectedValueOnce(new Error(code));
    const response = await post("/v1/transfers/bank", submission);
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ code });
  });

  it("maps an unresolvable account and an over-limit quote to 422", async () => {
    bankTransfers.enquire.mockRejectedValueOnce(
      new Error("ACCOUNT_RESOLUTION_FAILED"),
    );
    expect(
      (
        await post("/v1/transfers/name-enquiries", {
          bank_code: "058",
          account_number: "0123456789",
        })
      ).status,
    ).toBe(422);
    bankTransfers.quote.mockRejectedValueOnce(
      new Error("TRANSFER_LIMIT_EXCEEDED"),
    );
    expect(
      (
        await post("/v1/transfers/quotes", {
          enquiry_token: "77777777-7777-4777-8777-777777777777",
          amount_minor: "999999999999",
          currency: "NGN",
        })
      ).status,
    ).toBe(422);
  });
});
