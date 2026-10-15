import { createHmac } from "node:crypto";
import { jest } from "@jest/globals";
import type { Knex } from "knex";
import { ProviderRejectedError } from "../../src/services/payment-provider.js";
import { PaystackProvider } from "../../src/services/paystack-provider.js";
import { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";
import { customerReference } from "../../src/services/virtual-account-assignment-service.js";

const holder = {
  email: "synthetic@example.invalid",
  firstName: "Ayo",
  middleName: "David",
  lastName: "Ajayi",
  phone: "+2348000000000",
};

function provider(response: Response) {
  const http = jest.fn<typeof fetch>().mockResolvedValue(response);
  return {
    http,
    provider: new PaystackProvider(
      "sk_test_synthetic",
      "https://api.paystack.co",
      http,
      "test-bank",
    ),
  };
}

describe("Paystack dedicated account assignment", () => {
  it("sends the holder's legal name with the BVN and bank account", async () => {
    const { http, provider: paystack } = provider(
      new Response(
        JSON.stringify({
          status: true,
          message: "Assign dedicated account in progress",
        }),
        { status: 200 },
      ),
    );
    await paystack.assignVirtualAccount({
      holder,
      bvn: "22222222222",
      bankCode: "058",
      accountNumber: "0123456789",
    });
    const [url, init] = http.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.paystack.co/dedicated_account/assign",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      email: holder.email,
      first_name: "Ayo",
      middle_name: "David",
      last_name: "Ajayi",
      phone: holder.phone,
      preferred_bank: "test-bank",
      country: "NG",
      bvn: "22222222222",
      bank_code: "058",
      account_number: "0123456789",
    });
  });

  it("surfaces Paystack's own message when it declines the request", async () => {
    const { provider: paystack } = provider(
      new Response(JSON.stringify({ status: false, message: "Invalid BVN" }), {
        status: 400,
      }),
    );
    const attempt = paystack.assignVirtualAccount({
      holder,
      bvn: "22222222222",
      bankCode: "058",
      accountNumber: "0123456789",
    });
    await expect(attempt).rejects.toBeInstanceOf(ProviderRejectedError);
    await expect(attempt).rejects.toThrow("Invalid BVN");
  });

  it("hashes the email so webhooks match without storing it", () => {
    expect(customerReference(" Synthetic@Example.invalid ")).toBe(
      customerReference("synthetic@example.invalid"),
    );
    expect(customerReference(holder.email)).toMatch(
      /^email-sha256:[a-f0-9]{64}$/,
    );
  });
});

describe("Paystack webhook intake for assignments", () => {
  const secret = "sk_test_synthetic_secret";
  const sign = (body: Buffer) =>
    createHmac("sha512", secret).update(body).digest("hex");
  const db = {
    raw: jest.fn(async () => ({
      rows: [{ webhook_id: "webhook-1", replayed: false }],
    })),
  } as unknown as Knex;

  it("records the event, then applies it to the account request", async () => {
    const applyWebhook = jest.fn(async () => true);
    const service = new PaystackWebhookService(db, secret, "default", {
      applyWebhook,
    });
    const data = {
      customer: { id: 9001, email: holder.email },
      dedicated_account: { id: 77, account_number: "9930000001" },
    };
    const body = Buffer.from(
      JSON.stringify({ event: "dedicatedaccount.assign.success", data }),
    );
    await expect(service.receive(body, sign(body))).resolves.toEqual({
      webhookId: "webhook-1",
      replayed: false,
    });
    expect(applyWebhook).toHaveBeenCalledWith(
      "dedicatedaccount.assign.success",
      data,
    );
  });

  it("asks Paystack to retry when applying the event fails", async () => {
    const service = new PaystackWebhookService(db, secret, "default", {
      applyWebhook: () => Promise.reject(new Error("database down")),
    });
    const body = Buffer.from(
      JSON.stringify({
        event: "customeridentification.failed",
        data: { customer_id: 9001, email: holder.email, reason: "No match" },
      }),
    );
    await expect(service.receive(body, sign(body))).rejects.toThrow(
      "WEBHOOK_PROCESSING_FAILED",
    );
  });
});
