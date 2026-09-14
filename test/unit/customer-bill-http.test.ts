import { jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { BillPaymentService } from "../../src/services/bill-payment-service.js";
import type { CustomerBillQueryService } from "../../src/services/customer-bill-query-service.js";
import type { CustomerPaymentQueryService } from "../../src/services/customer-payment-query-service.js";
import type { PaymentCustomerAuthenticator } from "../../src/services/customer-token-authenticator.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

describe("customer bill HTTP API", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const customerId = "22222222-2222-4222-8222-222222222222";
  const productId = "33333333-3333-4333-8333-333333333333";

  const authenticator = {
    authenticate: jest.fn(async () => ({ tenantId, customerId })),
  } as unknown as PaymentCustomerAuthenticator;
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
  const app = createApp({} as PaystackWebhookService, {
    authenticator,
    queries: {} as CustomerPaymentQueryService,
    bills: { commands, queries },
  });

  it("authenticates and binds validation to the token customer", async () => {
    await request(app)
      .post("/v1/bills/customer-validations")
      .set("authorization", "Bearer customer-token")
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
      .set("authorization", "Bearer customer-token")
      .set("x-tenant-id", tenantId)
      .set("idempotency-key", "validation-2")
      .send({
        customer_id: "55555555-5555-4555-8555-555555555555",
        product_id: productId,
        customer_identifier: "1234567890",
      })
      .expect(403);
  });
});
