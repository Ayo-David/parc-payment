import { createHmac } from "node:crypto";
import knex, { type Knex } from "knex";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";
const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
describeDatabase("Paystack webhook intake", () => {
  let db: Knex;
  const secret = "sk_test_synthetic_only";
  beforeAll(() => {
    db = knex({ client: "pg", connection: databaseUrl! });
  });
  afterAll(async () => {
    await db("payment_webhooks").where({ provider_code: "PAYSTACK" }).delete();
    await db.destroy();
  });
  it("verifies the exact raw body, persists once, and rejects altered replays", async () => {
    const app = createApp(new PaystackWebhookService(db, secret));
    const body = JSON.stringify({
      event: "charge.success",
      data: { id: 123456, reference: "PARC-1" },
    });
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    await request(app)
      .post("/v1/webhooks/paystack")
      .set("content-type", "application/json")
      .set("x-paystack-signature", signature)
      .send(body)
      .expect(202);
    await request(app)
      .post("/v1/webhooks/paystack")
      .set("content-type", "application/json")
      .set("x-paystack-signature", signature)
      .send(body)
      .expect(409);
    const altered = JSON.stringify({
      event: "charge.success",
      data: { id: 123456, reference: "ALTERED" },
    });
    await request(app)
      .post("/v1/webhooks/paystack")
      .set("content-type", "application/json")
      .set(
        "x-paystack-signature",
        createHmac("sha512", secret).update(altered).digest("hex"),
      )
      .send(altered)
      .expect(409);
    expect(
      await db("payment_webhooks")
        .where({ provider_code: "PAYSTACK" })
        .count<{ count: string }[]>("* AS count")
        .first(),
    ).toMatchObject({ count: "1" });
  });
  it("rejects invalid signatures before persistence", async () => {
    await request(createApp(new PaystackWebhookService(db, secret)))
      .post("/v1/webhooks/paystack")
      .set("content-type", "application/json")
      .set("x-paystack-signature", "0".repeat(128))
      .send(JSON.stringify({ event: "charge.failed", data: { id: 999 } }))
      .expect(401);
  });
});
