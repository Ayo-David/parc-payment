import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { ExternalTransferService } from "../../src/services/external-transfer-service.js";
import { ProviderOutcomeAmbiguousError } from "../../src/services/payment-provider.js";
import type { PaymentProvider } from "../../src/services/payment-provider.js";
import type { ProviderRoutingService } from "../../src/services/provider-routing-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PAY-06 external transfers", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const customerId = randomUUID();
  const sourceAccountId = randomUUID();
  const sourceLedgerId = randomUUID();
  const settlementLedgerId = randomUUID();
  const routingDecisionId = randomUUID();

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    await db("financial_accounts").insert({
      id: sourceAccountId,
      tenant_id: tenantId,
      customer_id: customerId,
      account_type: "WALLET",
      account_number: "3000000001",
      currency: "NGN",
      status: "ACTIVE",
      ledger_account_id: sourceLedgerId,
    });
    await db("payment_provider_routing_decisions").insert({
      id: routingDecisionId,
      tenant_id: tenantId,
      capability: "INTERBANK_TRANSFER",
      currency: "NGN",
      provider_code: "BANKONE",
      selection_id: randomUUID(),
      selection_version: 1,
      routing_reason: "PREFERRED",
      request_hash: "b".repeat(64),
      correlation_id: randomUUID(),
      idempotency_key: "external-routing-test",
    });
  });

  afterAll(async () => {
    await db.raw(
      "ALTER TABLE public.payment_external_transfer_history DISABLE TRIGGER trg_protect_external_transfer_history",
    );
    await db("payment_external_transfer_history")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_external_transfer_history ENABLE TRIGGER trg_protect_external_transfer_history",
    );
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("payment_external_transfers")
      .where({ tenant_id: tenantId })
      .update({ active_attempt_id: null });
    await db("payment_attempts").where({ tenant_id: tenantId }).delete();
    await db("payment_external_transfers")
      .where({ tenant_id: tenantId })
      .delete();
    await db("payment_transactions").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions DISABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("payment_provider_routing_decisions")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions ENABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("financial_accounts").where({ tenant_id: tenantId }).delete();
    await db.destroy();
  });

  const command = (idempotencyKey: string) => ({
    tenantId,
    customerId,
    sourceAccountId,
    settlementLedgerAccountId: settlementLedgerId,
    beneficiaryName: "Synthetic Receiver",
    destinationAccountNumber: "3000000002",
    destinationBankCode: "999999",
    destinationBankName: "Synthetic Bank",
    destinationPhoneNumber: "08000000000",
    amountMinor: "100000",
    currency: "NGN",
    narration: "Synthetic external transfer",
    idempotencyKey,
    correlationId: randomUUID(),
    providerData: { synthetic: true },
  });

  /** Creates an external-transfer test service and exposes ledger call counters. */
  function service(provider: PaymentProvider) {
    const routing = {
      select: async () => ({
        provider,
        decisionId: routingDecisionId,
        replayed: false,
      }),
    } as unknown as ProviderRoutingService;
    const calls = { holds: 0, captures: 0, releases: 0 };
    const instance = new ExternalTransferService(db, routing, {
      createHold: async () => {
        calls.holds += 1;
        return { holdId: randomUUID(), replayed: false };
      },
      captureHold: async (input) => {
        calls.captures += 1;
        expect(input.destinationAccountId).toBe(settlementLedgerId);
        return { transactionId: randomUUID(), replayed: false };
      },
      releaseHold: async () => {
        calls.releases += 1;
      },
    });
    return { instance, calls };
  }

  const provider = (submit: PaymentProvider["submit"]): PaymentProvider => ({
    code: "BANKONE",
    supports: () => true,
    submit,
    inquire: async (reference) => ({
      providerReference: reference,
      state: "PENDING",
    }),
  });

  it("captures the hold only after final provider success", async () => {
    const { instance, calls } = service(
      provider(async () => ({
        providerReference: "success-1",
        state: "SUCCESS",
      })),
    );
    await expect(
      instance.initiate(command("external-success")),
    ).resolves.toMatchObject({ status: "SUCCEEDED" });
    expect(calls).toEqual({ holds: 1, captures: 1, releases: 0 });
  });

  it("retains the hold for pending and ambiguous outcomes", async () => {
    const pending = service(
      provider(async () => ({
        providerReference: "pending-1",
        state: "PENDING",
      })),
    );
    await expect(
      pending.instance.initiate(command("external-pending")),
    ).resolves.toMatchObject({ status: "PENDING" });
    expect(pending.calls).toEqual({ holds: 1, captures: 0, releases: 0 });
    const ambiguous = service(
      provider(async () => {
        throw new ProviderOutcomeAmbiguousError("timeout");
      }),
    );
    await expect(
      ambiguous.instance.initiate(command("external-ambiguous")),
    ).resolves.toMatchObject({ status: "PENDING" });
    expect(ambiguous.calls).toEqual({ holds: 1, captures: 0, releases: 0 });
  });

  it("releases the hold after an explicit final failure", async () => {
    const { instance, calls } = service(
      provider(async () => ({
        providerReference: "failed-1",
        state: "FAILED",
        providerStatus: "failed",
      })),
    );
    await expect(
      instance.initiate(command("external-failed")),
    ).resolves.toMatchObject({ status: "FAILED" });
    expect(calls).toEqual({ holds: 1, captures: 0, releases: 1 });
  });
});
