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
import type { BeneficiaryService } from "../../src/services/beneficiary-service.js";
import type { CustomerPaymentQueryService } from "../../src/services/customer-payment-query-service.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

describe("customer transactions and beneficiaries HTTP API", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const customerId = "22222222-2222-4222-8222-222222222222";
  const issuer = "https://auth.parc.invalid";
  let sign: (claims: JWTPayload) => Promise<string>;
  let app: ReturnType<typeof createApp>;
  const beneficiary = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Synthetic Receiver",
    nickname: null,
    account_number: "0123456789",
    bank_code: "058",
    bank_name: null,
    is_verified: false,
    is_favourite: false,
    created_at: "2026-10-12T10:00:00.000Z",
    last_used_at: null,
  };
  const queries = {
    transactions: jest.fn(async () => ({
      items: [],
      page: { next_cursor: null, has_more: false },
    })),
  };
  const beneficiaries = {
    list: jest.fn(async () => ({ items: [beneficiary] })),
    create: jest.fn(async () => ({ status: 201, body: beneficiary })),
  };
  const token = (client: string, scope: string) =>
    sign({
      sub: customerId,
      client_id: client,
      token_use: "delegated",
      tenant_id: tenantId,
      scope,
      subject_type: "CUSTOMER",
      subject_scope: "TENANT",
      session_id: "66666666-6666-4666-8666-666666666666",
      act: { sub: client },
    });
  const customer = () =>
    token("parc-mobile-bff", "payment.customer.read payment.customer.write");

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
      queries: queries as unknown as CustomerPaymentQueryService,
      beneficiaries: beneficiaries as unknown as BeneficiaryService,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes page_size and page_cursor through for the token's customer", async () => {
    await request(app)
      .get("/v1/transactions?page_size=50&page_cursor=abc")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .expect(200)
      .expect({ items: [], page: { next_cursor: null, has_more: false } });
    expect(queries.transactions).toHaveBeenCalledWith(
      tenantId,
      customerId,
      50,
      "abc",
    );
  });

  it("rejects an oversized page and maps an invalid cursor to 422", async () => {
    await request(app)
      .get("/v1/transactions?page_size=101")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .expect(422);
    queries.transactions.mockRejectedValueOnce(
      new Error("INVALID_PAGE_CURSOR"),
    );
    await request(app)
      .get("/v1/transactions?page_cursor=bad")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .expect(422)
      .expect({ code: "INVALID_PAGE_CURSOR" });
  });

  it("lists beneficiaries by kind for the token's customer", async () => {
    await request(app)
      .get("/v1/beneficiaries?kind=recent")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .expect(200)
      .expect({ items: [beneficiary] });
    expect(beneficiaries.list).toHaveBeenCalledWith(
      tenantId,
      customerId,
      "recent",
    );
    await request(app)
      .get("/v1/beneficiaries?kind=everyone")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .expect(422);
  });

  it("creates a beneficiary bound to the token's customer and idempotency key", async () => {
    await request(app)
      .post("/v1/beneficiaries")
      .set("authorization", `Bearer ${await customer()}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "beneficiary-1")
      .send({
        bank_code: "058",
        account_number: "0123456789",
        name: "  Synthetic Receiver ",
      })
      .expect(201)
      .expect(beneficiary);
    expect(beneficiaries.create).toHaveBeenCalledWith({
      tenantId,
      customerId,
      bankCode: "058",
      accountNumber: "0123456789",
      name: "Synthetic Receiver",
      idempotencyKey: "beneficiary-1",
    });
  });

  it("validates the beneficiary command and maps idempotency-key reuse to 409", async () => {
    const send = async (
      body: Record<string, unknown>,
      key: string | null = "beneficiary-1",
    ) => {
      const pending = request(app)
        .post("/v1/beneficiaries")
        .set("authorization", `Bearer ${await customer()}`)
        .set("x-tenant-id", tenantId);
      if (key !== null) pending.set("idempotency-key", key);
      return pending.send(body);
    };
    const valid = {
      bank_code: "058",
      account_number: "0123456789",
      name: "Synthetic Receiver",
    };
    expect((await send(valid, null)).status).toBe(422);
    expect((await send({ ...valid, account_number: "12345" })).status).toBe(
      422,
    );
    expect((await send({ ...valid, customer_id: randomUUID() })).status).toBe(
      422,
    );
    expect(beneficiaries.create).not.toHaveBeenCalled();
    beneficiaries.create.mockRejectedValueOnce(
      new Error("IDEMPOTENCY_KEY_REUSED"),
    );
    const reused = await send(valid);
    expect(reused.status).toBe(409);
    expect(reused.body).toEqual({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("requires the write scope and the mobile BFF as acting service", async () => {
    const readOnly = await token("parc-mobile-bff", "payment.customer.read");
    await request(app)
      .post("/v1/beneficiaries")
      .set("authorization", `Bearer ${readOnly}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "beneficiary-1")
      .send({ bank_code: "058", account_number: "0123456789", name: "Ada" })
      .expect(403);
    const otherService = await token(
      "parc-lending",
      "payment.customer.read payment.customer.write",
    );
    await request(app)
      .get("/v1/beneficiaries")
      .set("authorization", `Bearer ${otherService}`)
      .set("x-tenant-id", tenantId)
      .expect(403);
    await request(app)
      .get("/v1/transactions")
      .set("x-tenant-id", tenantId)
      .expect(401);
    expect(beneficiaries.list).not.toHaveBeenCalled();
    expect(beneficiaries.create).not.toHaveBeenCalled();
    expect(queries.transactions).not.toHaveBeenCalled();
  });
});
