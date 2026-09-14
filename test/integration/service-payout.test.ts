import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import {
  ProviderOutcomeAmbiguousError,
  ProviderRegistry,
  type PaymentProvider,
} from "../../src/services/payment-provider.js";
import { ProviderRoutingService } from "../../src/services/provider-routing-service.js";
import { ServicePayoutService } from "../../src/services/service-payout-service.js";
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
describeDatabase("LN-05 service payout ambiguity", () => {
  let db: Knex;
  const tenantId = randomUUID();
  beforeAll(() => {
    db = knex({ client: "pg", connection: databaseUrl! });
  });
  afterAll(async () => {
    await db.raw(
      "ALTER TABLE payment_provider_routing_decisions DISABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db.raw("SELECT set_config('app.current_tenant_id',?,false)", [
      tenantId,
    ]);
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("payment_service_payout_attempts")
      .where({ tenant_id: tenantId })
      .delete();
    await db("payment_service_payouts").where({ tenant_id: tenantId }).delete();
    await db("payment_provider_routing_decisions")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE payment_provider_routing_decisions ENABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db.destroy();
  });
  it("retains a submitted timeout as pending and never creates a second attempt on replay", async () => {
    let submissions = 0;
    const provider: PaymentProvider = {
      code: "PAYSTACK",
      supports: (capability, currency) =>
        capability === "INTERBANK_TRANSFER" && currency === "NGN",
      submit: () => {
        submissions++;
        return Promise.reject(
          new ProviderOutcomeAmbiguousError("timeout after submission"),
        );
      },
      inquire: () =>
        Promise.resolve({ providerReference: "pending", state: "PENDING" }),
    };
    const registry = new ProviderRegistry();
    registry.register(provider);
    const routing = new ProviderRoutingService(
      db,
      {
        resolve: () =>
          Promise.resolve({
            id: randomUUID(),
            tenant_id: tenantId,
            capability: "INTERBANK_TRANSFER",
            currency: "NGN",
            provider: "PAYSTACK",
            version: 1,
            approval_id: randomUUID(),
            selected_at: new Date().toISOString(),
          }),
      },
      registry,
    );
    const service = new ServicePayoutService(db, routing);
    const input = {
      tenantId,
      sourceService: "parc-lending" as const,
      sourceResourceId: randomUUID(),
      customerId: randomUUID(),
      ledgerTransactionId: randomUUID(),
      destinationReference: "bank-account-token",
      amountMinor: "100000",
      currency: "NGN" as const,
      narration: "Loan disbursement",
      idempotencyKey: randomUUID(),
      correlationId: randomUUID(),
      providerData: { account_token: "synthetic" },
    };
    expect(await service.submit(input)).toMatchObject({
      status: "PENDING",
      replayed: false,
    });
    expect(await service.submit(input)).toMatchObject({
      status: "PENDING",
      replayed: true,
    });
    expect(submissions).toBe(1);
    expect(
      await db("payment_service_payout_attempts")
        .where({ tenant_id: tenantId })
        .count<{ count: string }>("*")
        .first(),
    ).toEqual({ count: "1" });
  });
});
