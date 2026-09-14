import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import { BillCatalogueService } from "../../src/services/bill-catalogue-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("Monnify bill catalogue import and publication", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const actorId = randomUUID();

  beforeAll(() => {
    db = knex({ client: "pg", connection: databaseUrl! });
  });
  afterAll(async () => {
    await db.raw("SELECT set_config('app.current_tenant_id',?,false)", [
      tenantId,
    ]);
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE bill_products DISABLE TRIGGER trg_protect_published_bill_product",
    );
    await db("bill_products").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE bill_products ENABLE TRIGGER trg_protect_published_bill_product",
    );
    await db("bill_providers").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE bill_catalogue_publications DISABLE TRIGGER trg_protect_bill_catalogue_publication",
    );
    await db("bill_catalogue_publications")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE bill_catalogue_publications ENABLE TRIGGER trg_protect_bill_catalogue_publication",
    );
    await db.raw(
      "ALTER TABLE bill_catalogue_import_items DISABLE TRIGGER trg_protect_bill_catalogue_item",
    );
    await db("bill_catalogue_import_items")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE bill_catalogue_import_items ENABLE TRIGGER trg_protect_bill_catalogue_item",
    );
    await db("bill_catalogue_imports").where({ tenant_id: tenantId }).delete();
    await db("bill_categories").whereLike("code", "MONNIFY-%").delete();
    await db.destroy();
  });

  it("stages immutable evidence and publishes exactly once after bound approval", async () => {
    const consumed: Record<string, unknown>[] = [];
    const service = new BillCatalogueService(
      db,
      {
        categories: async () => ({
          content: [{ categoryCode: "AIRTIME", categoryName: "Airtime" }],
        }),
        billers: async () => ({
          content: [{ billerCode: "MTN", billerName: "MTN Nigeria" }],
        }),
        products: async () => ({
          content: [
            {
              productCode: "MTN-100",
              productName: "MTN 100",
              amount: "100.00",
            },
            {
              productCode: "MTN-VTU",
              productName: "MTN VTU",
              minAmount: "50",
              maxAmount: "50000",
            },
          ],
        }),
      },
      {
        consume: async (input) => {
          consumed.push(input);
        },
      },
    );
    const imported = await service.importDraft({
      tenantId,
      actorId,
      idempotencyKey: "catalogue-import-1",
    });
    expect(imported).toMatchObject({
      status: "DRAFT",
      category_count: 1,
      product_count: 2,
      replayed: false,
    });
    expect(
      await service.importDraft({
        tenantId,
        actorId,
        idempotencyKey: "catalogue-import-1",
      }),
    ).toMatchObject({ import_id: imported.import_id, replayed: true });
    const binding = await service.publicationBinding(
      tenantId,
      String(imported.import_id),
    );
    expect(binding).toMatchObject({
      action: "PRODUCT_PUBLICATION",
      resource_type: "bill_catalogue_import",
    });
    const command = {
      tenantId,
      importId: String(imported.import_id),
      actorId,
      approvalId: randomUUID(),
      idempotencyKey: "catalogue-publish-1",
      correlationId: randomUUID(),
    };
    const published = await service.publish(command);
    expect(published).toMatchObject({
      catalogue_version: 1,
      product_count: 2,
      replayed: false,
    });
    expect(consumed).toHaveLength(1);
    expect(consumed[0]).toMatchObject({
      payloadHash: binding.payload_hash,
      action: "PRODUCT_PUBLICATION",
    });
    expect(await service.publish(command)).toMatchObject({
      publication_id: published.publication_id,
      replayed: true,
    });
    expect(consumed).toHaveLength(1);
    await db.raw("SELECT set_config('app.current_tenant_id',?,false)", [
      tenantId,
    ]);
    expect(
      await db("bill_products").where({
        tenant_id: tenantId,
        catalogue_version: 1,
      }),
    ).toHaveLength(2);
    expect(
      await db("payment_outbox_events").where({
        tenant_id: tenantId,
        event_type: "payment.bill-catalogue-published.v1",
      }),
    ).toHaveLength(1);
    await expect(
      db("bill_catalogue_import_items")
        .where({ tenant_id: tenantId })
        .update({ product_name: "tampered" }),
    ).rejects.toThrow("immutable");
  });
});
