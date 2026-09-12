import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Knex } from "knex";

export class PaystackWebhookService {
  public constructor(
    private readonly db: Knex,
    private readonly secret: string,
    private readonly keyVersion = "default",
  ) {}
  public verify(rawBody: Buffer, signature: string): boolean {
    if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
    const expected = createHmac("sha512", this.secret)
      .update(rawBody)
      .digest("hex");
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  }
  public async receive(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ webhookId: string; replayed: boolean }> {
    if (!this.verify(rawBody, signature))
      throw new Error("INVALID_PAYSTACK_SIGNATURE");
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: unknown;
      data?: { id?: unknown; reference?: unknown };
    };
    if (typeof payload.event !== "string")
      throw new Error("INVALID_PAYSTACK_EVENT");
    const identity = payload.data?.id ?? payload.data?.reference;
    if (typeof identity !== "string" && typeof identity !== "number")
      throw new Error("INVALID_PAYSTACK_EVENT_IDENTITY");
    const reference = `${payload.event}:${String(identity)}`;
    const result = await this.db.raw<{
      rows: Array<{ webhook_id: string; replayed: boolean }>;
    }>(
      "SELECT * FROM public.record_verified_payment_webhook(?,?,?,?,?,?,?,?)",
      [
        "PAYSTACK",
        reference,
        payload.event,
        payload,
        createHash("sha256").update(rawBody).digest("hex"),
        createHash("sha256").update(signature).digest("hex"),
        "HMAC-SHA512",
        this.keyVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Webhook receipt was not persisted");
    return { webhookId: row.webhook_id, replayed: row.replayed };
  }
}
