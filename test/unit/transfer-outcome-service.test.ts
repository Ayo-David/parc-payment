import { createHmac } from "node:crypto";
import { jest } from "@jest/globals";
import type { Knex } from "knex";
import type { ExternalTransferService } from "../../src/services/external-transfer-service.js";
import type {
  PaymentProvider,
  ProviderSubmission,
} from "../../src/services/payment-provider.js";
import type { PaymentReversalService } from "../../src/services/payment-reversal-service.js";
import { PaystackWebhookService } from "../../src/services/paystack-webhook-service.js";
import {
  isTransferEvent,
  PAYSTACK_TRANSFER_REVERSAL_RULE,
  TransferOutcomeService,
} from "../../src/services/transfer-outcome-service.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const transferId = "22222222-2222-4222-8222-222222222222";
const paymentId = "33333333-3333-4333-8333-333333333333";
const ledgerTransactionId = "44444444-4444-4444-8444-444444444444";
const webhookId = "55555555-5555-4555-8555-555555555555";
const reference = `parc-${transferId}`;

function setup(options?: {
  resolved?: boolean;
  status?: string;
  verified?: ProviderSubmission;
}) {
  const updates: Record<string, unknown>[] = [];
  const builder = {
    where: () => builder,
    first: async () => ({
      payment_id: paymentId,
      amount: "100000",
      currency: "NGN",
      ledger_transaction_id: ledgerTransactionId,
    }),
    update: async (values: Record<string, unknown>) => {
      updates.push(values);
      return 1;
    },
  };
  const tx = Object.assign(() => builder, {
    raw: async () => undefined,
    fn: { now: () => "now()" },
  });
  const db = {
    raw: jest.fn(async () => ({
      rows: options?.resolved === false ? [] : [{ tenant_id: tenantId }],
    })),
    transaction: async (work: (trx: unknown) => Promise<unknown>) => work(tx),
  } as unknown as Knex;
  const inquire = jest.fn<PaymentProvider["inquire"]>(
    async () =>
      options?.verified ?? {
        providerReference: reference,
        state: "FAILED",
        providerStatus: "reversed",
      },
  );
  const provider: PaymentProvider = {
    code: "PAYSTACK",
    supports: () => true,
    submit: async () => {
      throw new Error("not used");
    },
    inquire,
  };
  const settle = jest.fn<ExternalTransferService["inquire"]>(async () => ({
    id: transferId,
    paymentId,
    status: options?.status ?? "SUCCEEDED",
    replayed: false,
  }));
  const reverse = jest.fn<PaymentReversalService["reverse"]>(async () => ({
    reversalId: "r-1",
    ledgerTransactionId: "l-2",
    replayed: false,
  }));
  return {
    service: new TransferOutcomeService(
      db,
      provider,
      { inquire: settle },
      { reverse },
    ),
    db,
    inquire,
    settle,
    reverse,
    updates,
  };
}

describe("Paystack transfer outcomes", () => {
  it("recognises only transfer outcome events", () => {
    expect(isTransferEvent("transfer.success")).toBe(true);
    expect(isTransferEvent("transfer.failed")).toBe(true);
    expect(isTransferEvent("transfer.reversed")).toBe(true);
    expect(isTransferEvent("charge.success")).toBe(false);
  });

  it("settles the tenant's transfer through a provider inquiry, not the webhook body", async () => {
    const { service, db, settle, reverse } = setup();
    await expect(
      service.applyWebhook({
        event: "transfer.success",
        data: { reference, status: "success", amount: 999999999 },
        webhookId,
      }),
    ).resolves.toBe(true);
    expect(db.raw).toHaveBeenCalledWith(
      "SELECT * FROM public.resolve_external_transfer(?, ?)",
      ["PAYSTACK", transferId],
    );
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        transferId,
        correlationId: webhookId,
      }),
    );
    expect(reverse).not.toHaveBeenCalled();
  });

  it("ignores references that are not our customer transfers", async () => {
    const foreign = setup();
    await expect(
      foreign.service.applyWebhook({
        event: "transfer.success",
        data: { reference: "TRF_external" },
        webhookId,
      }),
    ).resolves.toBe(false);
    expect(foreign.db.raw).not.toHaveBeenCalled();
    const unknown = setup({ resolved: false });
    await expect(
      unknown.service.applyWebhook({
        event: "transfer.success",
        data: { reference },
        webhookId,
      }),
    ).resolves.toBe(false);
    expect(unknown.settle).not.toHaveBeenCalled();
  });

  it("leaves a reversal before success to the inquiry, which releases the hold", async () => {
    const { service, reverse } = setup({ status: "FAILED" });
    await service.applyWebhook({
      event: "transfer.reversed",
      data: { reference },
      webhookId,
    });
    expect(reverse).not.toHaveBeenCalled();
  });

  it("returns the customer's money when Paystack confirms a reversal after success", async () => {
    const { service, reverse, updates } = setup();
    await service.applyWebhook({
      event: "transfer.reversed",
      data: { reference },
      webhookId,
    });
    expect(reverse).toHaveBeenCalledWith({
      tenantId,
      paymentId,
      originalLedgerTransactionId: ledgerTransactionId,
      amountMinor: "100000",
      currency: "NGN",
      reason: "Provider reversed the transfer after reporting success",
      idempotencyKey: `external-transfer:${transferId}:provider-reversal`,
      correlationId: webhookId,
      automatedRuleId: PAYSTACK_TRANSFER_REVERSAL_RULE,
    });
    expect(updates).toContainEqual(
      expect.objectContaining({
        status: "REVERSED",
        failure_code: "PROVIDER_REVERSED",
      }),
    );
  });

  it("refuses to reverse until Paystack's verify API agrees", async () => {
    const { service, reverse } = setup({
      verified: {
        providerReference: reference,
        state: "SUCCESS",
        providerStatus: "success",
      },
    });
    await expect(
      service.applyWebhook({
        event: "transfer.reversed",
        data: { reference },
        webhookId,
      }),
    ).rejects.toThrow("Provider has not confirmed this transfer reversal");
    expect(reverse).not.toHaveBeenCalled();
  });

  it("is reached from a signed webhook, and a failure makes Paystack redeliver", async () => {
    const secret = "sk_test_synthetic_only";
    const db = {
      raw: jest.fn(async () => ({
        rows: [{ webhook_id: webhookId, replayed: false }],
      })),
    } as unknown as Knex;
    const applyWebhook = jest.fn<TransferOutcomeService["applyWebhook"]>(
      async () => true,
    );
    const webhooks = new PaystackWebhookService(
      db,
      secret,
      "default",
      undefined,
      undefined,
      { applyWebhook },
    );
    const body = Buffer.from(
      JSON.stringify({
        event: "transfer.success",
        data: { id: 9001, reference },
      }),
    );
    const sign = (raw: Buffer) =>
      createHmac("sha512", secret).update(raw).digest("hex");
    await webhooks.receive(body, sign(body));
    expect(applyWebhook).toHaveBeenCalledWith({
      event: "transfer.success",
      data: { id: 9001, reference },
      webhookId,
    });
    applyWebhook.mockRejectedValueOnce(new Error("Ledger unavailable"));
    await expect(webhooks.receive(body, sign(body))).rejects.toThrow(
      "WEBHOOK_PROCESSING_FAILED",
    );
  });
});
