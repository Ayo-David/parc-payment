import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import {
  ProviderRegistry,
  type PaymentProvider,
} from "../../src/services/payment-provider.js";
import { ProviderRoutingService } from "../../src/services/provider-routing-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
describeDatabase("PAY-01 tenant-aware provider routing", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const selectionId = randomUUID();
  const provider: PaymentProvider = {
    code: "PAYSTACK",
    supports: (capability, currency) =>
      capability === "COLLECTION" && currency === "NGN",
    submit: () =>
      Promise.resolve({ providerReference: "synthetic", state: "PENDING" }),
    inquire: () =>
      Promise.resolve({ providerReference: "synthetic", state: "PENDING" }),
  };
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
    await db("payment_provider_routing_decisions")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE payment_provider_routing_decisions ENABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db.destroy();
  });
  it("uses the tenant selection, persists immutable evidence, and replays exactly", async () => {
    const registry = new ProviderRegistry();
    registry.register(provider);
    const routing = new ProviderRoutingService(
      db,
      {
        resolve: () =>
          Promise.resolve({
            id: selectionId,
            tenant_id: tenantId,
            capability: "COLLECTION",
            currency: "NGN",
            provider: "PAYSTACK",
            version: 3,
            approval_id: randomUUID(),
            selected_at: new Date().toISOString(),
          }),
      },
      registry,
    );
    const input = {
      tenantId,
      capability: "COLLECTION" as const,
      currency: "NGN",
      correlationId: randomUUID(),
      idempotencyKey: randomUUID(),
    };
    const first = await routing.select(input);
    expect(first).toMatchObject({ provider, replayed: false });
    expect(await routing.select(input)).toMatchObject({
      decisionId: first.decisionId,
      replayed: true,
    });
    await db.raw("SELECT set_config('app.current_tenant_id',?,false)", [
      tenantId,
    ]);
    await expect(
      db("payment_provider_routing_decisions")
        .where({ id: first.decisionId })
        .update({ provider_code: "WEMA" }),
    ).rejects.toThrow("immutable");
  });
  it("rejects disabled currencies and does not silently fail over after selection", async () => {
    const registry = new ProviderRegistry();
    registry.register(provider);
    const routing = new ProviderRoutingService(
      db,
      {
        resolve: () =>
          Promise.resolve({
            id: selectionId,
            tenant_id: tenantId,
            capability: "COLLECTION",
            currency: "NGN",
            provider: "PAYSTACK",
            version: 3,
            approval_id: randomUUID(),
            selected_at: new Date().toISOString(),
          }),
      },
      registry,
    );
    await expect(
      routing.select({
        tenantId,
        capability: "COLLECTION",
        currency: "USD",
        correlationId: randomUUID(),
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow("not operationally enabled");
    await expect(
      routing.select({
        tenantId,
        capability: "COLLECTION",
        currency: "NGN",
        correlationId: randomUUID(),
        idempotencyKey: randomUUID(),
        excludedProvider: "PAYSTACK",
        reason: "CIRCUIT_OPEN",
      }),
    ).rejects.toThrow("No approved fallback");
  });
});
