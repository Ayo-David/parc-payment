import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Knex } from "knex";
import {
  isDedicatedAccountDeposit,
  type DepositService,
} from "./deposit-service.js";
import {
  isVirtualAccountAssignmentEvent,
  type VirtualAccountAssignmentService,
} from "./virtual-account-assignment-service.js";

export class PaystackWebhookService {
  public constructor(
    private readonly db: Knex,
    private readonly secret: string,
    private readonly keyVersion = "default",
    private readonly assignments?: Pick<
      VirtualAccountAssignmentService,
      "applyWebhook"
    >,
    private readonly deposits?: Pick<DepositService, "applyCharge">,
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
      data?: {
        id?: unknown;
        reference?: unknown;
        customer_id?: unknown;
        customer?: { id?: unknown };
      };
    };
    if (typeof payload.event !== "string")
      throw new Error("INVALID_PAYSTACK_EVENT");
    const assignment = isVirtualAccountAssignmentEvent(payload.event);
    // Assignment events carry no transaction id, and one customer can fail
    // validation more than once, so the body digest keeps each one distinct.
    const identity = assignment
      ? `${String(payload.data?.customer?.id ?? payload.data?.customer_id ?? "customer")}:${createHash("sha256").update(rawBody).digest("hex").slice(0, 24)}`
      : (payload.data?.id ?? payload.data?.reference);
    if (typeof identity !== "string" && typeof identity !== "number")
      throw new Error("INVALID_PAYSTACK_EVENT_IDENTITY");
    const reference = `${payload.event}:${String(identity)}`;
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const result = await this.db.raw<{
      rows: Array<{ webhook_id: string; replayed: boolean }>;
    }>(
      "SELECT * FROM public.record_verified_payment_webhook(?,?,?,?,?,?,?,?)",
      [
        "PAYSTACK",
        reference,
        payload.event,
        payload,
        payloadHash,
        createHash("sha256").update(signature).digest("hex"),
        "HMAC-SHA512",
        this.keyVersion,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Webhook receipt was not persisted");
    // Applied on redelivery too (idempotent), so a failure here is retried by Paystack.
    if (assignment && this.assignments)
      await this.assignments
        .applyWebhook(payload.event, payload.data)
        .catch(() => {
          throw new Error("WEBHOOK_PROCESSING_FAILED");
        });
    if (this.deposits && isDedicatedAccountDeposit(payload.event, payload.data))
      await this.deposits
        .applyCharge({
          data: payload.data,
          webhookId: row.webhook_id,
          payloadHash,
        })
        .catch(() => {
          throw new Error("WEBHOOK_PROCESSING_FAILED");
        });
    return { webhookId: row.webhook_id, replayed: row.replayed };
  }
}
