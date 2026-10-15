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
import type { CustomerPaymentQueryService } from "../../src/services/customer-payment-query-service.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";
import type {
  FundingAccountState,
  VirtualAccountAssignmentService,
} from "../../src/services/virtual-account-assignment-service.js";

describe("wallet funding account HTTP API", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const customerId = "22222222-2222-4222-8222-222222222222";
  const ledgerAccountId = "44444444-4444-4444-8444-444444444444";
  const issuer = "https://auth.parc.invalid";
  let sign: (claims: JWTPayload) => Promise<string>;
  let app: ReturnType<typeof createApp>;
  const fundingDetails = jest.fn<() => Promise<unknown>>();
  const state = jest.fn<() => Promise<FundingAccountState>>();
  const requestAccount = jest.fn<() => Promise<FundingAccountState>>();
  const listBanks = jest.fn(async () => [
    { name: "Kuda", code: "50211", active: true },
    { name: "Access Bank", code: "044", active: true },
    { name: "Closed Bank", code: "000", active: false },
  ]);
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
  const body = {
    bvn: "22222222222",
    bank_code: "058",
    account_number: "0123456789",
    ledger_account_id: ledgerAccountId,
  };

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
      queries: { fundingDetails } as unknown as CustomerPaymentQueryService,
      virtualAccounts: {
        state,
        request: requestAccount,
      } as unknown as VirtualAccountAssignmentService,
      banks: { listBanks },
    });
  });

  beforeEach(() => {
    fundingDetails.mockReset();
    state.mockReset();
    requestAccount.mockReset();
  });

  it("lists active Paystack banks by name and caches the directory", async () => {
    for (let call = 0; call < 2; call += 1) {
      const response = await request(app)
        .get("/v1/reference/banks")
        .set("authorization", `Bearer ${await customer()}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        banks: [
          { bank_code: "044", bank_name: "Access Bank" },
          { bank_code: "50211", bank_name: "Kuda" },
        ],
      });
    }
    expect(listBanks).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ status: "NONE" }, 404, "FUNDING_ACCOUNT_NOT_FOUND"],
    [{ status: "PENDING" }, 409, "FUNDING_ACCOUNT_PENDING"],
    [
      { status: "FAILED", reason: "Account number or BVN is incorrect" },
      422,
      "FUNDING_ACCOUNT_REJECTED",
    ],
  ] as const)(
    "reports a missing funding account as %o",
    async (current, status, code) => {
      fundingDetails.mockRejectedValue(new Error("FUNDING_ACCOUNT_NOT_FOUND"));
      state.mockResolvedValue(current);
      const response = await request(app)
        .get("/v1/wallet/funding-details")
        .set("authorization", `Bearer ${await customer()}`);
      expect(response.status).toBe(status);
      expect(response.body).toMatchObject({ code });
      if (current.status === "FAILED")
        expect(response.body.message).toBe(current.reason);
    },
  );

  it("starts the account request for the authenticated customer", async () => {
    requestAccount.mockResolvedValue({ status: "PENDING" });
    const response = await request(app)
      .post("/v1/wallet/virtual-account")
      .set("authorization", `Bearer ${await customer()}`)
      .set("idempotency-key", "va-1")
      .send(body);
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: "PENDING" });
    expect(requestAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        customerId,
        ledgerAccountId,
        bvn: body.bvn,
        bankCode: "058",
        accountNumber: "0123456789",
        idempotencyKey: "va-1",
      }),
    );
  });

  it("accepts a request without a BVN, leaving the stored one to be used", async () => {
    requestAccount.mockResolvedValue({ status: "PENDING" });
    const { bvn: _omitted, ...withoutBvn } = body;
    void _omitted;
    const response = await request(app)
      .post("/v1/wallet/virtual-account")
      .set("authorization", `Bearer ${await customer()}`)
      .set("idempotency-key", "va-4")
      .send(withoutBvn);
    expect(response.status).toBe(202);
    expect(requestAccount).toHaveBeenCalledWith(
      expect.not.objectContaining({ bvn: expect.anything() }),
    );
  });

  it("asks for the BVN when none is on file", async () => {
    requestAccount.mockRejectedValue(new Error("BVN_REQUIRED"));
    const { bvn: _omitted, ...withoutBvn } = body;
    void _omitted;
    const response = await request(app)
      .post("/v1/wallet/virtual-account")
      .set("authorization", `Bearer ${await customer()}`)
      .set("idempotency-key", "va-5")
      .send(withoutBvn);
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: "BVN_REQUIRED" });
  });

  it("returns the provider's rejection reason", async () => {
    requestAccount.mockResolvedValue({
      status: "FAILED",
      reason: "Invalid BVN",
    });
    const response = await request(app)
      .post("/v1/wallet/virtual-account")
      .set("authorization", `Bearer ${await customer()}`)
      .set("idempotency-key", "va-2")
      .send(body);
    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      code: "FUNDING_ACCOUNT_REJECTED",
      message: "Invalid BVN",
    });
  });

  it("rejects a malformed BVN before calling the provider", async () => {
    const response = await request(app)
      .post("/v1/wallet/virtual-account")
      .set("authorization", `Bearer ${await customer()}`)
      .set("idempotency-key", "va-3")
      .send({ ...body, bvn: "123" });
    expect(response.status).toBe(422);
    expect(requestAccount).not.toHaveBeenCalled();
  });
});
