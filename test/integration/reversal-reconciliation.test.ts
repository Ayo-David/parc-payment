import { createHash, randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { PaymentReversalService } from "../../src/services/payment-reversal-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PAY-07 reversals and reconciliation controls", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const customerId = randomUUID();
  const paymentId = randomUUID();
  const originalLedgerId = randomUUID();

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    await db("payment_transactions").insert({
      id: paymentId,
      tenant_id: tenantId,
      customer_id: customerId,
      payment_type: "ACCOUNT_FUNDING",
      channel: "SYSTEM",
      amount: "50000",
      currency: "NGN",
      status: "SUCCESSFUL",
      reference: "PAY07-TEST",
    });
  });

  afterAll(async () => {
    await db.raw(
      "ALTER TABLE public.payment_reversal_history DISABLE TRIGGER trg_protect_payment_reversal_history",
    );
    await db("payment_reversal_history")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_reversal_history ENABLE TRIGGER trg_protect_payment_reversal_history",
    );
    await db("payment_reversals").where({ tenant_id: tenantId }).delete();
    await db("payment_reconciliation_records")
      .where({ tenant_id: tenantId })
      .delete();
    await db("payment_reconciliation_runs")
      .where({ tenant_id: tenantId })
      .delete();
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("payment_transactions").where({ tenant_id: tenantId }).delete();
    await db.destroy();
  });

  it("consumes manual approval and posts one compensating Ledger reversal", async () => {
    const reversalLedgerId = randomUUID();
    let approvalCalls = 0;
    let ledgerCalls = 0;
    const service = new PaymentReversalService(
      db,
      {
        reverseTransaction: async () => {
          ledgerCalls += 1;
          return { reversalTransactionId: reversalLedgerId, replayed: false };
        },
      },
      {
        consume: async () => {
          approvalCalls += 1;
        },
      },
    );
    const command = {
      tenantId,
      paymentId,
      originalLedgerTransactionId: originalLedgerId,
      amountMinor: "50000",
      currency: "NGN",
      reason: "Approved synthetic refund",
      idempotencyKey: "reversal-1",
      correlationId: randomUUID(),
      approvalId: randomUUID(),
    };
    await expect(service.reverse(command)).resolves.toEqual({
      reversalId: expect.any(String),
      ledgerTransactionId: reversalLedgerId,
      replayed: false,
    });
    await expect(service.reverse(command)).resolves.toMatchObject({
      ledgerTransactionId: reversalLedgerId,
      replayed: true,
    });
    expect(approvalCalls).toBe(2);
    expect(ledgerCalls).toBe(1);
  });

  it("stores signed reconciliation differences and deduplicates evidence", async () => {
    const runId = randomUUID();
    const evidence = {
      provider_reference: "provider-1",
      amount_minor: "49000",
    };
    const evidenceHash = createHash("sha256")
      .update(JSON.stringify(evidence))
      .digest("hex");
    const discrepancyKey = createHash("sha256")
      .update(`${tenantId}:provider-1`)
      .digest("hex");
    await db("payment_reconciliation_runs").insert({
      id: runId,
      tenant_id: tenantId,
      provider_code: "PAYSTACK",
      period_start: "2026-09-01T00:00:00Z",
      period_end: "2026-09-02T00:00:00Z",
      source_object_reference: "provider://synthetic/report-1",
      source_hash: evidenceHash,
      idempotency_key: "recon-1",
    });
    await db("payment_reconciliation_records").insert({
      tenant_id: tenantId,
      run_id: runId,
      payment_id: paymentId,
      resource_type: "PAYMENT",
      resource_id: paymentId,
      provider_code: "PAYSTACK",
      provider_reference: "provider-1",
      provider_amount: "49000",
      internal_amount: "50000",
      currency: "NGN",
      status: "EXCEPTION",
      difference_amount: "-1000",
      reconciliation_date: "2026-09-02",
      evidence_hash: evidenceHash,
      discrepancy_key: discrepancyKey,
    });
    await expect(
      db("payment_reconciliation_records").insert({
        tenant_id: tenantId,
        run_id: runId,
        payment_id: paymentId,
        resource_type: "PAYMENT",
        resource_id: paymentId,
        provider_code: "PAYSTACK",
        provider_reference: "provider-1-copy",
        provider_amount: "49000",
        internal_amount: "50000",
        currency: "NGN",
        status: "EXCEPTION",
        difference_amount: "-1000",
        reconciliation_date: "2026-09-02",
        evidence_hash: evidenceHash,
        discrepancy_key: discrepancyKey,
      }),
    ).rejects.toThrow();
  });
});
