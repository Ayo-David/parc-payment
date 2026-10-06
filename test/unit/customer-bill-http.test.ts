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
import type { BillCatalogueService } from "../../src/services/bill-catalogue-service.js";
import type { BillPaymentService } from "../../src/services/bill-payment-service.js";
import type { CustomerBillQueryService } from "../../src/services/customer-bill-query-service.js";
import type { CustomerPaymentQueryService } from "../../src/services/customer-payment-query-service.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

describe("customer bill HTTP API", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const customerId = "22222222-2222-4222-8222-222222222222";
  const productId = "33333333-3333-4333-8333-333333333333";

  const issuer = "https://auth.parc.invalid";
  const sessionId = "66666666-6666-4666-8666-666666666666";
  let sign: (claims: JWTPayload) => Promise<string>;
  let customerToken: string;
  let app: ReturnType<typeof createApp>;
  const importDraft = jest.fn(async () => ({
    id: randomUUID(),
    replayed: false,
  }));
  const commands = {
    validateCustomer: jest.fn(async () => ({
      validation_id: "44444444-4444-4444-8444-444444444444",
      customer_name: "Ada Customer",
      expires_at: "2026-09-14T12:00:00.000Z",
      replayed: false,
    })),
    createQuote: jest.fn(),
    pay: jest.fn(),
  } as unknown as BillPaymentService;
  const queries = {
    listProducts: jest.fn(async () => []),
    get: jest.fn(),
  } as unknown as CustomerBillQueryService;
  const delegated = (
    client: string,
    scope: string,
    subject: { id: string; type: "CUSTOMER" | "ADMINISTRATOR" },
  ) =>
    sign({
      sub: subject.id,
      client_id: client,
      token_use: "delegated",
      tenant_id: tenantId,
      scope,
      subject_type: subject.type,
      subject_scope: "TENANT",
      session_id: sessionId,
      act: { sub: client },
    });

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
    customerToken = await delegated(
      "parc-mobile-bff",
      "payment.customer.read payment.customer.write",
      { id: customerId, type: "CUSTOMER" },
    );
    const access = createParcAuth({
      issuer,
      audience: "parc-payment",
      keys: jwks,
    });
    app = createApp(
      {} as PaystackWebhookService,
      {
        access,
        queries: {} as CustomerPaymentQueryService,
        bills: { commands, queries },
      },
      {
        access,
        catalogues: { importDraft } as unknown as BillCatalogueService,
      },
    );
  });

  it("authenticates and binds validation to the token customer", async () => {
    await request(app)
      .post("/v1/bills/customer-validations")
      .set("authorization", `Bearer ${customerToken}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "validation-1")
      .send({
        customer_id: customerId,
        product_id: productId,
        customer_identifier: "1234567890",
      })
      .expect(200)
      .expect((response) =>
        expect(response.body).toMatchObject({
          customer_name: "Ada Customer",
          replayed: false,
        }),
      );
    expect(commands.validateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, customerId, productId }),
    );
  });

  it("rejects a customer id that differs from the authenticated subject", async () => {
    await request(app)
      .post("/v1/bills/customer-validations")
      .set("authorization", `Bearer ${customerToken}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "validation-2")
      .send({
        customer_id: "55555555-5555-4555-8555-555555555555",
        product_id: productId,
        customer_identifier: "1234567890",
      })
      .expect(403);
  });

  it("rejects customer tokens from another acting service or without the scope", async () => {
    for (const token of [
      await delegated("parc-lending", "payment.customer.write", {
        id: customerId,
        type: "CUSTOMER",
      }),
      await delegated("parc-mobile-bff", "payment.customer.read", {
        id: customerId,
        type: "CUSTOMER",
      }),
    ])
      await request(app)
        .post("/v1/bills/customer-validations")
        .set("authorization", `Bearer ${token}`)
        .set("x-tenant-id", tenantId)
        .set("idempotency-key", randomUUID())
        .send({
          customer_id: customerId,
          product_id: productId,
          customer_identifier: "1234567890",
        })
        .expect(403);
  });

  it("takes the bill-catalogue actor from the administrator token, not a header", async () => {
    const administratorId = "77777777-7777-4777-8777-777777777777";
    const path = `/internal/v1/tenants/${tenantId}/bill-catalogue/imports`;
    await request(app)
      .post(path)
      .set("authorization", `Bearer ${customerToken}`)
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", randomUUID())
      .expect(403);
    await request(app)
      .post(path)
      .set(
        "authorization",
        `Bearer ${await delegated("parc-admin-bff", "payment.bill-catalogue.manage", { id: administratorId, type: "ADMINISTRATOR" })}`,
      )
      .set("x-tenant-id", tenantId)
      .set("x-actor-id", randomUUID())
      .set("idempotency-key", randomUUID())
      .expect(201);
    expect(importDraft).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, actorId: administratorId }),
    );
  });
});
