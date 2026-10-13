import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { BeneficiaryService } from "../../src/services/beneficiary-service.js";
import {
  CustomerPaymentQueryService,
  encodeTransactionCursor,
} from "../../src/services/customer-payment-query-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("customer transactions and beneficiaries", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const customerId = randomUUID();
  const otherCustomerId = randomUUID();
  const transactionIds: string[] = [];

  const transaction = (
    tenant: string,
    customer: string,
    reference: string,
    createdAt: string,
    deleted = false,
  ) => ({
    id: randomUUID(),
    tenant_id: tenant,
    customer_id: customer,
    payment_type: "ACCOUNT_FUNDING",
    channel: "SYSTEM",
    amount: "250000",
    currency: "NGN",
    status: "SUCCESSFUL",
    reference,
    created_at: createdAt,
    deleted_at: deleted ? createdAt : null,
  });

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    // Three rows share a timestamp, so the id tie-break must keep pages stable.
    const rows = [
      transaction(tenantId, customerId, "T-1", "2026-10-01T10:00:00.123456Z"),
      transaction(tenantId, customerId, "T-2", "2026-10-02T10:00:00.123456Z"),
      transaction(tenantId, customerId, "T-3", "2026-10-02T10:00:00.123456Z"),
      transaction(tenantId, customerId, "T-4", "2026-10-02T10:00:00.123456Z"),
      transaction(tenantId, customerId, "T-5", "2026-10-03T10:00:00.123456Z"),
    ];
    transactionIds.push(...rows.map((row) => row.id));
    await db("payment_transactions").insert([
      ...rows,
      transaction(
        tenantId,
        customerId,
        "DELETED",
        "2026-10-04T10:00:00Z",
        true,
      ),
      transaction(tenantId, otherCustomerId, "OTHER", "2026-10-04T10:00:00Z"),
      transaction(otherTenantId, customerId, "TENANT", "2026-10-04T10:00:00Z"),
    ]);
  });

  afterAll(async () => {
    try {
      await db.raw(
        "ALTER TABLE public.payment_external_transfer_history DISABLE TRIGGER trg_protect_external_transfer_history",
      );
      for (const tenant of [tenantId, otherTenantId]) {
        await db("payment_external_transfer_history")
          .where({ tenant_id: tenant })
          .delete();
        await db("payment_external_transfers")
          .where({ tenant_id: tenant })
          .delete();
        await db("payment_idempotency_keys")
          .where({ tenant_id: tenant })
          .delete();
        await db("beneficiaries").where({ tenant_id: tenant }).delete();
        await db("payment_transactions").where({ tenant_id: tenant }).delete();
        await db("financial_accounts").where({ tenant_id: tenant }).delete();
      }
    } finally {
      await db.raw(
        "ALTER TABLE public.payment_external_transfer_history ENABLE TRIGGER trg_protect_external_transfer_history",
      );
      await db.destroy();
    }
  });

  it("pages a customer's transactions newest first without skipping or repeating", async () => {
    const queries = new CustomerPaymentQueryService(db);
    const seen: string[] = [];
    let cursor: string | undefined;
    const hasMore: boolean[] = [];
    do {
      const page = await queries.transactions(tenantId, customerId, 2, cursor);
      seen.push(...page.items.map((item) => String(item.reference)));
      hasMore.push(page.page.has_more);
      cursor = page.page.next_cursor ?? undefined;
      expect(page.page.next_cursor === null).toBe(!page.page.has_more);
    } while (cursor);
    expect(hasMore).toEqual([true, true, false]);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(seen[0]).toBe("T-5");
    expect(seen[4]).toBe("T-1");
    expect(seen.slice(1, 4).sort()).toEqual(["T-2", "T-3", "T-4"]);
  });

  it("serves the payment record shape with the amount in kobo as a string", async () => {
    const page = await new CustomerPaymentQueryService(db).transactions(
      tenantId,
      customerId,
      1,
    );
    expect(Object.keys(page.items[0]!).sort()).toEqual(
      [
        "amount",
        "currency",
        "id",
        "narration",
        "payment_type",
        "processed_at",
        "reference",
        "requested_at",
        "status",
      ].sort(),
    );
    expect(page.items[0]).toMatchObject({
      amount: "250000",
      currency: "NGN",
      payment_type: "ACCOUNT_FUNDING",
      status: "SUCCESSFUL",
    });
  });

  it("rejects malformed cursors and cursors that name another customer's row", async () => {
    const queries = new CustomerPaymentQueryService(db);
    await expect(
      queries.transactions(tenantId, customerId, 2, "not-a-cursor"),
    ).rejects.toThrow("INVALID_PAGE_CURSOR");
    await expect(
      queries.transactions(
        tenantId,
        otherCustomerId,
        2,
        encodeTransactionCursor(transactionIds[0]!),
      ),
    ).rejects.toThrow("INVALID_PAGE_CURSOR");
    await expect(
      queries.transactions(
        otherTenantId,
        customerId,
        2,
        encodeTransactionCursor(transactionIds[0]!),
      ),
    ).rejects.toThrow("INVALID_PAGE_CURSOR");
  });

  it("creates beneficiaries idempotently and never duplicates an account", async () => {
    const service = new BeneficiaryService(db);
    const command = {
      tenantId,
      customerId,
      bankCode: "058",
      accountNumber: "0123456789",
      name: "Synthetic Receiver",
      idempotencyKey: "beneficiary-1",
    };
    const created = await service.create(command);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "Synthetic Receiver",
      account_number: "0123456789",
      bank_code: "058",
      is_verified: false,
      is_favourite: false,
      last_used_at: null,
    });
    await expect(service.create(command)).resolves.toEqual(created);
    await expect(
      service.create({ ...command, name: "Different Name" }),
    ).rejects.toThrow("IDEMPOTENCY_KEY_REUSED");
    const again = await service.create({
      ...command,
      idempotencyKey: "beneficiary-2",
    });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(created.body.id);
    const concurrent = await Promise.all(
      ["c-1", "c-2", "c-3"].map((key) =>
        service.create({
          ...command,
          accountNumber: "9876543210",
          idempotencyKey: key,
        }),
      ),
    );
    expect(new Set(concurrent.map((result) => result.body.id)).size).toBe(1);
    expect(
      concurrent.map((result) => result.status).sort((a, b) => a - b),
    ).toEqual([200, 200, 201]);
  });

  it("lists only the customer's own beneficiaries and orders recent by last transfer", async () => {
    const service = new BeneficiaryService(db);
    const used = await service.create({
      tenantId,
      customerId,
      bankCode: "044",
      accountNumber: "1111111111",
      name: "Aaron Recent",
      idempotencyKey: "beneficiary-used",
    });
    await service.create({
      tenantId,
      customerId: otherCustomerId,
      bankCode: "044",
      accountNumber: "2222222222",
      name: "Other Customer",
      idempotencyKey: "beneficiary-other",
    });
    await db("beneficiaries")
      .where({ id: used.body.id })
      .update({ is_favourite: true });
    const sourceAccountId = randomUUID();
    const sourceLedgerId = randomUUID();
    await db("financial_accounts").insert({
      id: sourceAccountId,
      tenant_id: tenantId,
      customer_id: customerId,
      account_type: "WALLET",
      account_number: "3000000009",
      currency: "NGN",
      status: "ACTIVE",
      ledger_account_id: sourceLedgerId,
    });
    await db("payment_external_transfers").insert({
      tenant_id: tenantId,
      payment_id: transactionIds[0],
      customer_id: customerId,
      source_account_id: sourceAccountId,
      source_ledger_account_id: sourceLedgerId,
      settlement_ledger_account_id: randomUUID(),
      beneficiary_id: used.body.id,
      beneficiary_name: "Aaron Recent",
      destination_account_number: "1111111111",
      destination_bank_code: "044",
      amount: "1000",
      currency: "NGN",
      narration: "Synthetic transfer",
      idempotency_key: "recent-transfer",
      request_hash: "c".repeat(64),
      correlation_id: randomUUID(),
    });

    const all = await service.list(tenantId, customerId, "all");
    expect(all.items.map((item) => item.name)).toEqual([
      "Aaron Recent",
      "Synthetic Receiver",
      "Synthetic Receiver",
    ]);
    const recent = await service.list(tenantId, customerId, "recent");
    expect(recent.items.map((item) => item.id)).toEqual([used.body.id]);
    expect(recent.items[0]!.last_used_at).not.toBeNull();
    const favourite = await service.list(tenantId, customerId, "favourite");
    expect(favourite.items.map((item) => item.id)).toEqual([used.body.id]);
    await expect(
      service.list(otherTenantId, customerId, "all"),
    ).resolves.toEqual({ items: [] });
  });
});
