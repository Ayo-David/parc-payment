import { jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";

describe("Paystack webhook HTTP status mapping", () => {
  const receive =
    jest.fn<
      (
        body: Buffer,
        signature: string,
      ) => Promise<{ webhookId: string; replayed: boolean }>
    >();
  const app = createApp({ receive } as unknown as PaystackWebhookService);
  const deliver = () =>
    request(app)
      .post("/v1/webhooks/paystack")
      .set("content-type", "application/json")
      .set("x-paystack-signature", "a".repeat(128))
      .send(JSON.stringify({ event: "dedicatedaccount.assign.success" }));
  let logged: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    receive.mockReset();
    logged = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => logged.mockRestore());

  it("accepts a new delivery and flags a replay", async () => {
    receive.mockResolvedValueOnce({ webhookId: "w1", replayed: false });
    await deliver().expect(202);
    receive.mockResolvedValueOnce({ webhookId: "w1", replayed: true });
    await deliver().expect(409);
    expect(logged).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_PAYSTACK_SIGNATURE", 401],
    ["Webhook identity reused with different evidence", 409],
    ["INVALID_PAYSTACK_EVENT", 400],
    ["INVALID_PAYSTACK_EVENT_IDENTITY", 400],
  ])("maps %s to %i and logs it", async (message, status) => {
    receive.mockRejectedValueOnce(new Error(message));
    const response = await deliver().expect(status);
    expect(response.body).toEqual({ code: message });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("treats an unparseable body as malformed", async () => {
    receive.mockRejectedValueOnce(new SyntaxError("Unexpected token"));
    await deliver().expect(400);
  });

  it("returns a retryable 500 for unexpected failures without exposing the cause", async () => {
    receive.mockRejectedValueOnce(
      new Error(
        "function public.record_verified_payment_webhook(...) does not exist",
      ),
    );
    const response = await deliver().expect(500);
    expect(response.body).toEqual({ code: "WEBHOOK_PROCESSING_FAILED" });
    const line = JSON.parse(String(logged.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(line).toMatchObject({
      level: "error",
      msg: "Paystack webhook rejected",
      status: 500,
      error: expect.stringContaining("record_verified_payment_webhook"),
    });
  });

  it("logs the underlying cause of a processing failure", async () => {
    receive.mockRejectedValueOnce(
      new Error("WEBHOOK_PROCESSING_FAILED", {
        cause: new Error("Provider configuration disappeared"),
      }),
    );
    await deliver().expect(500);
    const line = JSON.parse(String(logged.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;
    expect(line).toMatchObject({
      error: "WEBHOOK_PROCESSING_FAILED",
      cause: "Provider configuration disappeared",
    });
    expect(JSON.stringify(line)).not.toContain("dedicatedaccount");
  });
});
