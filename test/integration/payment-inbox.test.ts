import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { withTenantTransaction } from "../../src/database/client.js";
import { PaymentInboxRepository } from "../../src/repositories/payment-inbox-repository.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("general Payment inbox", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  beforeAll(() => {
    db = knex({ client: "pg", connection: databaseUrl! });
  });
  afterAll(async () => {
    await db.raw("SELECT set_config('app.current_tenant_id',?,false)", [
      tenantId,
    ]);
    await db("payment_inbox_events")
      .whereIn("tenant_id", [tenantId, otherTenantId])
      .delete();
    await db.destroy();
  });

  it("deduplicates delivery and enforces the processing lifecycle", async () => {
    await db.transaction(async (outer) => {
      await outer.raw("SET LOCAL ROLE parc_payment_worker");
      await withTenantTransaction(outer, tenantId, async (tx) => {
        const inbox = new PaymentInboxRepository(tx);
        const event = {
          eventId: randomUUID(),
          tenantId,
          sourceService: "parc-lending",
          eventType: "loan.disbursed.v1",
          eventVersion: 1,
          payload: { loan_id: randomUUID() },
        };
        const first = await inbox.receive(event);
        expect(first.duplicate).toBe(false);
        expect(await inbox.receive(event)).toEqual({
          id: first.id,
          duplicate: true,
        });
        expect(await inbox.markProcessing(first.id)).toBe(true);
        expect(await inbox.markProcessed(first.id)).toBe(true);
        expect(await inbox.markProcessed(first.id)).toBe(false);
      });
    });
  });

  it("isolates tenants and denies runtime writes", async () => {
    await expect(
      db.transaction(async (outer) => {
        await outer.raw("SET LOCAL ROLE parc_payment_runtime");
        await withTenantTransaction(outer, tenantId, (tx) =>
          new PaymentInboxRepository(tx).receive({
            eventId: randomUUID(),
            tenantId,
            sourceService: "parc-auth-customer",
            eventType: "customer.restricted.v1",
            eventVersion: 1,
            payload: {},
          }),
        );
      }),
    ).rejects.toThrow(/permission denied/i);
    await db.transaction(async (outer) => {
      await outer.raw("SET LOCAL ROLE parc_payment_worker");
      await withTenantTransaction(outer, otherTenantId, async (tx) => {
        expect(
          await tx("payment_inbox_events").where({ tenant_id: tenantId }),
        ).toHaveLength(0);
      });
    });
  });
});
