import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { InternalTransferService } from "../../src/services/internal-transfer-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PAY-05 internal transfers", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const customerId = randomUUID();
  const recipientId = randomUUID();
  const sourceAccountId = randomUUID();
  const destinationAccountId = randomUUID();
  const sourceLedgerId = randomUUID();
  const destinationLedgerId = randomUUID();

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    await db("financial_accounts").insert([
      {
        id: sourceAccountId,
        tenant_id: tenantId,
        customer_id: customerId,
        account_type: "WALLET",
        account_number: "2000000001",
        currency: "NGN",
        status: "ACTIVE",
        ledger_account_id: sourceLedgerId,
      },
      {
        id: destinationAccountId,
        tenant_id: tenantId,
        customer_id: recipientId,
        account_type: "WALLET",
        account_number: "2000000002",
        currency: "NGN",
        status: "ACTIVE",
        ledger_account_id: destinationLedgerId,
      },
    ]);
  });

  afterAll(async () => {
    await db.raw(
      "ALTER TABLE public.payment_internal_transfer_history DISABLE TRIGGER trg_protect_internal_transfer_history",
    );
    await db("payment_internal_transfer_history")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_internal_transfer_history ENABLE TRIGGER trg_protect_internal_transfer_history",
    );
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("payment_internal_transfers")
      .where({ tenant_id: tenantId })
      .delete();
    await db("payment_transactions").where({ tenant_id: tenantId }).delete();
    await db("financial_accounts").where({ tenant_id: tenantId }).delete();
    await db.destroy();
  });

  it("reserves and captures once, then returns an exact replay", async () => {
    const holdId = randomUUID();
    const transactionId = randomUUID();
    let holdCalls = 0;
    let captureCalls = 0;
    const service = new InternalTransferService(db, {
      createHold: async () => {
        holdCalls += 1;
        return { holdId, replayed: false };
      },
      captureHold: async (input) => {
        captureCalls += 1;
        expect(input.sourceAccountId).toBe(sourceLedgerId);
        expect(input.destinationAccountId).toBe(destinationLedgerId);
        return { transactionId, replayed: false };
      },
      releaseHold: async () => undefined,
    });
    const command = {
      tenantId,
      customerId,
      sourceAccountId,
      destinationAccountId,
      amountMinor: "50000",
      currency: "NGN",
      narration: "Synthetic internal transfer",
      idempotencyKey: "internal-1",
      correlationId: randomUUID(),
    };
    await expect(service.transfer(command)).resolves.toMatchObject({
      status: "SUCCEEDED",
      ledgerTransactionId: transactionId,
      replayed: false,
    });
    await expect(service.transfer(command)).resolves.toMatchObject({
      status: "SUCCEEDED",
      ledgerTransactionId: transactionId,
      replayed: true,
    });
    expect(holdCalls).toBe(1);
    expect(captureCalls).toBe(1);
  });

  it("retries an uncertain capture with the same hold and idempotency identity", async () => {
    const holdId = randomUUID();
    const transactionId = randomUUID();
    const captureKeys: string[] = [];
    let captureCalls = 0;
    const service = new InternalTransferService(db, {
      createHold: async () => ({ holdId, replayed: false }),
      captureHold: async (input) => {
        captureKeys.push(input.idempotencyKey);
        captureCalls += 1;
        if (captureCalls === 1) throw new Error("ambiguous timeout");
        return { transactionId, replayed: true };
      },
      releaseHold: async () => undefined,
    });
    const command = {
      tenantId,
      customerId,
      sourceAccountId,
      destinationAccountId,
      amountMinor: "75000",
      currency: "NGN",
      narration: "Synthetic retry",
      idempotencyKey: "internal-2",
      correlationId: randomUUID(),
    };
    await expect(service.transfer(command)).rejects.toThrow(
      "ambiguous timeout",
    );
    await expect(service.transfer(command)).resolves.toMatchObject({
      status: "SUCCEEDED",
      ledgerTransactionId: transactionId,
      replayed: true,
    });
    expect(new Set(captureKeys).size).toBe(1);
  });
});
