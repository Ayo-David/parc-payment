import { createHash, randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import type { VirtualAccountProvider } from "../../src/services/payment-provider.js";
import { CollectionService } from "../../src/services/collection-service.js";
import { VirtualAccountService } from "../../src/services/virtual-account-service.js";
import type { ProviderRoutingService } from "../../src/services/provider-routing-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PAY-04 virtual accounts and collections", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const customerId = randomUUID();
  const providerId = randomUUID();
  const routingDecisionId = randomUUID();
  const selectionId = randomUUID();

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    await db("account_providers").insert({
      id: providerId,
      tenant_id: tenantId,
      provider_code: "BANKONE",
      provider_name: "BankOne",
      provider_type: "BANK",
      is_active: true,
    });
    await db("payment_provider_routing_decisions").insert({
      id: routingDecisionId,
      tenant_id: tenantId,
      capability: "VIRTUAL_ACCOUNT",
      currency: "NGN",
      provider_code: "BANKONE",
      selection_id: selectionId,
      selection_version: 1,
      routing_reason: "PREFERRED",
      request_hash: "a".repeat(64),
      correlation_id: randomUUID(),
      idempotency_key: "routing-test",
    });
  });

  afterAll(async () => {
    await db.raw(
      "ALTER TABLE public.payment_collection_status_history DISABLE TRIGGER trg_protect_collection_history",
    );
    await db("payment_collection_status_history")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_collection_status_history ENABLE TRIGGER trg_protect_collection_history",
    );
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("payment_collections").where({ tenant_id: tenantId }).delete();
    await db("payment_transactions").where({ tenant_id: tenantId }).delete();
    await db("virtual_account_provisioning_requests")
      .where({ tenant_id: tenantId })
      .delete();
    await db("account_status_history").where({ tenant_id: tenantId }).delete();
    await db("account_provider_accounts")
      .where({ tenant_id: tenantId })
      .delete();
    await db("financial_accounts").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions DISABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("payment_provider_routing_decisions")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions ENABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("account_providers").where({ tenant_id: tenantId }).delete();
    await db.destroy();
  });

  it("provisions one provider account and safely replays the command", async () => {
    let calls = 0;
    const provider: VirtualAccountProvider = {
      code: "BANKONE",
      supports: () => true,
      submit: async () => ({ providerReference: "unused", state: "PENDING" }),
      inquire: async () => ({ providerReference: "unused", state: "PENDING" }),
      createVirtualAccount: async () => {
        calls += 1;
        return {
          accountNumber: "1000000100",
          providerCustomerReference: "CUS-100",
          providerAccountReference: "ACC-100",
          bankName: "BankOne",
        };
      },
    };
    const routing = {
      select: async () => ({
        provider,
        decisionId: routingDecisionId,
        replayed: false,
      }),
    } as unknown as ProviderRoutingService;
    const service = new VirtualAccountService(db, routing);
    const command = {
      tenantId,
      customerId,
      currency: "NGN",
      idempotencyKey: "va-1",
      correlationId: randomUUID(),
      accountName: "Synthetic Customer",
      providerData: { transient: true },
    };
    await expect(service.create(command)).resolves.toMatchObject({
      status: "ACTIVE",
      accountNumber: "1000000100",
      replayed: false,
    });
    await expect(service.create(command)).resolves.toMatchObject({
      status: "ACTIVE",
      accountNumber: "1000000100",
      replayed: true,
    });
    expect(calls).toBe(1);
  });

  it("posts a verified collection to Ledger once and emits one event", async () => {
    const ledgerTransactionId = randomUUID();
    let calls = 0;
    const service = new CollectionService(db, {
      post: async () => {
        calls += 1;
        return { transactionId: ledgerTransactionId, replayed: false };
      },
    });
    const payload = { event: "charge.success", reference: "COL-1" };
    const command = {
      tenantId,
      providerCode: "BANKONE",
      providerReference: "COL-1",
      providerAccountNumber: "1000000100",
      amountMinor: "250000",
      currency: "NGN",
      payloadHash: createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex"),
      debitLedgerAccountId: randomUUID(),
      creditLedgerAccountId: randomUUID(),
      correlationId: randomUUID(),
    };
    await expect(service.confirm(command)).resolves.toMatchObject({
      status: "POSTED",
      replayed: false,
    });
    await expect(service.confirm(command)).resolves.toMatchObject({
      status: "POSTED",
      replayed: true,
    });
    expect(calls).toBe(1);
    expect(
      await db("payment_outbox_events")
        .where({
          tenant_id: tenantId,
          event_type: "payment.collection-confirmed.v1",
        })
        .count<{ count: string }[]>("id as count")
        .first(),
    ).toEqual({ count: "1" });
  });
});
