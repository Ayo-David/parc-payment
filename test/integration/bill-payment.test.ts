import { randomUUID } from "node:crypto";
import knex, { type Knex } from "knex";
import {
  BillPaymentProviderRegistry,
  SandboxBillPaymentProvider,
} from "../../src/services/bill-payment-provider.js";
import { BillPaymentService } from "../../src/services/bill-payment-service.js";
import { BillPaymentInquiryWorker } from "../../src/services/bill-payment-inquiry-worker.js";
import type { BillPaymentProvider } from "../../src/services/bill-payment-provider.js";
import type { ProviderRoutingService } from "../../src/services/provider-routing-service.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("PAY-08 bill payments", () => {
  let db: Knex;
  const tenantId = randomUUID();
  const customerId = randomUUID();
  const accountId = randomUUID();
  const sourceLedgerId = randomUUID();
  const payableLedgerId = randomUUID();
  const revenueLedgerId = randomUUID();
  const taxLedgerId = randomUUID();
  const categoryId = randomUUID();
  const providerId = randomUUID();
  const productId = randomUUID();
  const routingDecisionId = randomUUID();

  beforeAll(async () => {
    db = knex({ client: "pg", connection: databaseUrl! });
    await db.raw(
      "ALTER TYPE public.payment_type_enum ADD VALUE IF NOT EXISTS 'BILL_PAYMENT'",
    );
    await db("bill_categories").insert({
      id: categoryId,
      code: `AIRTIME-${tenantId}`,
      name: "Airtime",
      category: "AIRTIME",
    });
    await db("bill_providers").insert({
      id: providerId,
      tenant_id: tenantId,
      category_id: categoryId,
      provider_code: "SANDBOX_BILLS",
      provider_name: "Sandbox Bills",
      provider_payable_ledger_account_id: payableLedgerId,
      revenue_ledger_account_id: revenueLedgerId,
      tax_ledger_account_id: taxLedgerId,
    });
    await db("bill_products").insert({
      id: productId,
      tenant_id: tenantId,
      provider_id: providerId,
      category_id: categoryId,
      product_code: "AIRTIME-VARIABLE",
      product_name: "Airtime",
      currency: "NGN",
      denomination_type: "VARIABLE",
      min_amount: "10000",
      max_amount: "1000000",
      fee_amount: "100",
      tax_amount: "50",
      cashback_amount: "25",
      published_at: new Date(),
    });
    await db("financial_accounts").insert({
      id: accountId,
      tenant_id: tenantId,
      customer_id: customerId,
      account_type: "WALLET",
      currency: "NGN",
      status: "ACTIVE",
      ledger_account_id: sourceLedgerId,
    });
    await db("payment_provider_routing_decisions").insert({
      id: routingDecisionId,
      tenant_id: tenantId,
      capability: "BILL_PAYMENT",
      currency: "NGN",
      provider_code: "SANDBOX_BILLS",
      selection_id: randomUUID(),
      selection_version: 1,
      routing_reason: "PREFERRED",
      request_hash: "c".repeat(64),
      correlation_id: randomUUID(),
      idempotency_key: `bill-routing-${tenantId}`,
    });
  });

  afterAll(async () => {
    await db.raw(
      "ALTER TABLE public.bill_transaction_status_history DISABLE TRIGGER trg_protect_bill_history",
    );
    await db("bill_transaction_status_history")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.bill_transaction_status_history ENABLE TRIGGER trg_protect_bill_history",
    );
    await db("payment_outbox_events").where({ tenant_id: tenantId }).delete();
    await db("bill_transaction_attempts")
      .where({ tenant_id: tenantId })
      .delete();
    await db("bill_transactions").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.bill_payment_quotes DISABLE TRIGGER trg_protect_bill_quote",
    );
    await db("bill_payment_quotes").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.bill_payment_quotes ENABLE TRIGGER trg_protect_bill_quote",
    );
    await db.raw(
      "ALTER TABLE public.bill_customer_validations DISABLE TRIGGER trg_protect_bill_validation",
    );
    await db("bill_customer_validations")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.bill_customer_validations ENABLE TRIGGER trg_protect_bill_validation",
    );
    await db.raw(
      "ALTER TABLE public.bill_products DISABLE TRIGGER trg_protect_published_bill_product",
    );
    await db("bill_products").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.bill_products ENABLE TRIGGER trg_protect_published_bill_product",
    );
    await db("bill_providers").where({ tenant_id: tenantId }).delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions DISABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("payment_provider_routing_decisions")
      .where({ tenant_id: tenantId })
      .delete();
    await db.raw(
      "ALTER TABLE public.payment_provider_routing_decisions ENABLE TRIGGER trg_immutable_payment_routing_decision",
    );
    await db("financial_accounts").where({ tenant_id: tenantId }).delete();
    await db("bill_categories").where({ id: categoryId }).delete();
    await db.destroy();
  });

  it("quotes exact minor units and fulfils once against a captured Ledger hold", async () => {
    const routing = {
      select: async () => ({
        provider: { code: "SANDBOX_BILLS" },
        decisionId: routingDecisionId,
        replayed: false,
      }),
    } as unknown as ProviderRoutingService;
    const registry = new BillPaymentProviderRegistry();
    registry.register(new SandboxBillPaymentProvider());
    const calls = { holds: 0, captures: 0, releases: 0 };
    const service = new BillPaymentService(db, routing, registry, {
      createHold: async () => {
        calls.holds += 1;
        return { holdId: randomUUID(), replayed: false };
      },
      captureBillHold: async (input) => {
        calls.captures += 1;
        expect(input).toMatchObject({
          amountMinor: "100000",
          feeMinor: "100",
          taxMinor: "50",
        });
        return { transactionId: randomUUID(), replayed: false };
      },
      releaseHold: async () => {
        calls.releases += 1;
      },
    });
    const quote = await service.createQuote({
      tenantId,
      customerId,
      productId,
      customerIdentifier: "08030000000",
      amountMinor: "100000",
      idempotencyKey: `quote-${tenantId}`,
      correlationId: randomUUID(),
    });
    expect(quote.total_debit_minor).toBe("100150");
    const command = {
      tenantId,
      customerId,
      sourceAccountId: sourceLedgerId,
      quoteId: quote.quote_id,
      customerIdentifier: "08030000000",
      idempotencyKey: `pay-${tenantId}`,
      correlationId: randomUUID(),
    };
    await expect(service.pay(command)).resolves.toMatchObject({
      status: "SUCCESSFUL",
      replayed: false,
    });
    await expect(service.pay(command)).resolves.toMatchObject({
      status: "SUCCESSFUL",
      replayed: true,
    });
    await expect(
      service.pay({
        ...command,
        idempotencyKey: `pay-different-key-${tenantId}`,
      }),
    ).resolves.toMatchObject({
      status: "SUCCESSFUL",
      replayed: true,
    });
    expect(calls).toEqual({ holds: 1, captures: 1, releases: 0 });
    expect(
      await db("payment_outbox_events")
        .where({ tenant_id: tenantId, event_type: "payment.bill-fulfilled.v1" })
        .count<{ count: string }>("*")
        .first(),
    ).toEqual({ count: "1" });
  });

  it("leases a pending vend, requeries once, and captures the original hold", async () => {
    const routing = {
      select: async () => ({
        provider: { code: "SANDBOX_BILLS" },
        decisionId: routingDecisionId,
        replayed: false,
      }),
    } as unknown as ProviderRoutingService;
    const provider: BillPaymentProvider = {
      code: "SANDBOX_BILLS",
      validateCustomer: async () => ({ evidence: { valid: true } }),
      fulfil: async (input) => ({
        providerReference: `BILL-${input.transactionId}`,
        state: "PENDING",
      }),
      inquire: async (providerReference) => ({
        providerReference,
        state: "SUCCESS",
        token: "TOKEN-123",
      }),
    };
    const registry = new BillPaymentProviderRegistry();
    registry.register(provider);
    const calls = { captures: 0, releases: 0 };
    const ledger = {
      createHold: async () => ({ holdId: randomUUID(), replayed: false }),
      captureBillHold: async () => {
        calls.captures += 1;
        return { transactionId: randomUUID(), replayed: false };
      },
      releaseHold: async () => {
        calls.releases += 1;
      },
    };
    const service = new BillPaymentService(db, routing, registry, ledger);
    const quote = await service.createQuote({
      tenantId,
      customerId,
      productId,
      customerIdentifier: "08031111111",
      amountMinor: "200000",
      idempotencyKey: `pending-quote-${tenantId}`,
      correlationId: randomUUID(),
    });
    const submitted = await service.pay({
      tenantId,
      customerId,
      sourceAccountId: sourceLedgerId,
      quoteId: quote.quote_id,
      customerIdentifier: "08031111111",
      idempotencyKey: `pending-pay-${tenantId}`,
      correlationId: randomUUID(),
    });
    expect(submitted.status).toBe("PROCESSING");
    await db("bill_transaction_attempts")
      .where({
        tenant_id: tenantId,
        bill_transaction_id: submitted.bill_transaction_id,
      })
      .update({ next_inquiry_at: new Date(Date.now() - 1_000) });

    const worker = new BillPaymentInquiryWorker(
      db,
      registry,
      ledger,
      "bill-worker-test",
    );
    await expect(worker.runBatch()).resolves.toBe(1);
    await expect(worker.runBatch()).resolves.toBe(0);
    expect(calls).toEqual({ captures: 1, releases: 0 });
    await expect(
      db("bill_transactions")
        .where({ tenant_id: tenantId, id: submitted.bill_transaction_id })
        .first("status", "outcome_class", "response_payload"),
    ).resolves.toMatchObject({
      status: "SUCCESSFUL",
      outcome_class: "FINAL_SUCCESS",
      response_payload: { token: "TOKEN-123" },
    });
  });
});
