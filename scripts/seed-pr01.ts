import { createHash } from "node:crypto";
import knex from "knex";
import { z } from "zod";
import { CollectionService } from "../src/services/collection-service.js";
import { HttpLedgerPostingGateway } from "../src/services/ledger-gateway.js";
import { ParcTokenClient } from "../src/security/parc-service-auth.js";

const config = z
  .object({
    NODE_ENV: z.enum(["development", "test"]),
    DATABASE_URL: z.string().url(),
    LEDGER_URL: z.string().url(),
    AUTH_JWT_ISSUER: z.string().url(),
    AUTH_TOKEN_URL: z.string().url(),
    SERVICE_CLIENT_KEY_ID: z.string().min(1),
    SERVICE_CLIENT_PRIVATE_KEY_BASE64: z.string().min(1),
    PR01_TENANT_A_ID: z.string().uuid(),
    PR01_TENANT_B_ID: z.string().uuid(),
    PR01_CUSTOMER_A_ID: z.string().uuid(),
    PR01_CUSTOMER_B_ID: z.string().uuid(),
  })
  .parse(process.env);

const database = knex({ client: "pg", connection: config.DATABASE_URL });
const tokens = await ParcTokenClient.fromBase64Key({
  tokenUrl: config.AUTH_TOKEN_URL,
  issuer: config.AUTH_JWT_ISSUER,
  clientId: "parc-payment",
  keyId: config.SERVICE_CLIENT_KEY_ID,
  privateKeyBase64: config.SERVICE_CLIENT_PRIVATE_KEY_BASE64,
});
const fixtures = [
  {
    tenantId: config.PR01_TENANT_A_ID,
    customerId: config.PR01_CUSTOMER_A_ID,
    providerId: "11111111-1111-4111-8111-111111111131",
    financialAccountId: "11111111-1111-4111-8111-111111111132",
    providerAccountId: "11111111-1111-4111-8111-111111111133",
    accountNumber: "9900000001",
    providerReference: "PR01-PAYSTACK-A",
    collectionReference: "PR01-COLLECTION-A-0001",
  },
  {
    tenantId: config.PR01_TENANT_B_ID,
    customerId: config.PR01_CUSTOMER_B_ID,
    providerId: "22222222-2222-4222-8222-222222222231",
    financialAccountId: "22222222-2222-4222-8222-222222222232",
    providerAccountId: "22222222-2222-4222-8222-222222222233",
    accountNumber: "9900000002",
    providerReference: "PR01-PAYSTACK-B",
    collectionReference: "PR01-COLLECTION-B-0001",
  },
] as const;

async function ledgerRequest(
  path: string,
  tenantId: string,
  options?: { method?: string; body?: unknown; idempotencyKey?: string },
): Promise<Record<string, unknown>> {
  const response = await fetch(new URL(path, config.LEDGER_URL), {
    method: options?.method ?? "GET",
    headers: {
      authorization: await tokens.authorization({
        audience: "parc-ledger",
        scopes: [
          (options?.method ?? "GET") === "GET"
            ? "ledger.balances.read"
            : path === "/internal/v1/accounts"
              ? "ledger.accounts.provision"
              : "ledger.postings.write",
        ],
        tenantId,
      }),
      "x-tenant-id": tenantId,
      "x-calling-service": "parc-payment",
      ...(options?.idempotencyKey
        ? { "idempotency-key": options.idempotencyKey }
        : {}),
      ...(options?.body ? { "content-type": "application/json" } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(`Ledger request ${path} failed with ${response.status}`);
  return body;
}

try {
  const collections = new CollectionService(
    database,
    new HttpLedgerPostingGateway(config.LEDGER_URL, tokens),
  );
  const output = [];

  for (const fixture of fixtures) {
    const wallet = await ledgerRequest(
      `/internal/v1/customers/${fixture.customerId}/wallet-balance?currency=NGN`,
      fixture.tenantId,
    );
    const settlement = await ledgerRequest(
      "/internal/v1/accounts",
      fixture.tenantId,
      {
        method: "POST",
        idempotencyKey: "pr01-settlement-cash-v1",
        body: {
          owner_type: "TENANT",
          owner_id: fixture.tenantId,
          purpose: "PR01_SETTLEMENT_CASH",
          account_type: "ASSET",
          currency: "NGN",
        },
      },
    );
    const walletAccountId = z.string().uuid().parse(wallet.account_id);
    const settlementAccountId = z.string().uuid().parse(settlement.account_id);

    await database.transaction(async (transaction) => {
      await transaction("account_providers")
        .insert({
          id: fixture.providerId,
          tenant_id: fixture.tenantId,
          provider_code: "PAYSTACK",
          provider_name: "Paystack PR-01 simulator",
          provider_type: "PAYMENT_PROCESSOR",
          is_active: true,
          configuration: JSON.stringify({ fixture: "PR-01" }),
        })
        .onConflict("id")
        .merge({ is_active: true, updated_at: transaction.fn.now() });

      await transaction("financial_accounts")
        .insert({
          id: fixture.financialAccountId,
          tenant_id: fixture.tenantId,
          customer_id: fixture.customerId,
          provider_id: fixture.providerId,
          account_type: "VIRTUAL_BANK_ACCOUNT",
          account_number: fixture.accountNumber,
          account_name: "PR-01 Fixture Customer",
          bank_code: "999",
          bank_name: "Paystack Test Bank",
          currency: "NGN",
          status: "ACTIVE",
          provider_reference: fixture.providerReference,
          is_primary: true,
          ledger_account_id: walletAccountId,
          metadata: JSON.stringify({ fixture: "PR-01", disposable: true }),
        })
        .onConflict("id")
        .merge({
          status: "ACTIVE",
          ledger_account_id: walletAccountId,
          updated_at: transaction.fn.now(),
        });

      await transaction("account_provider_accounts")
        .insert({
          id: fixture.providerAccountId,
          tenant_id: fixture.tenantId,
          account_id: fixture.financialAccountId,
          provider_id: fixture.providerId,
          provider_account_id: fixture.providerReference,
          provider_account_number: fixture.accountNumber,
          provider_metadata: JSON.stringify({ fixture: "PR-01" }),
        })
        .onConflict("id")
        .ignore();
    });

    const evidence = {
      provider: "PAYSTACK",
      reference: fixture.collectionReference,
      accountNumber: fixture.accountNumber,
      amountMinor: "250000",
      currency: "NGN",
      status: "success",
    };
    const collection = await collections.confirm({
      tenantId: fixture.tenantId,
      providerCode: "PAYSTACK",
      providerReference: fixture.collectionReference,
      providerAccountNumber: fixture.accountNumber,
      amountMinor: "250000",
      currency: "NGN",
      payloadHash: createHash("sha256")
        .update(JSON.stringify(evidence))
        .digest("hex"),
      providerPaidAt: "2026-09-15T09:00:00.000Z",
      debitLedgerAccountId: settlementAccountId,
      creditLedgerAccountId: walletAccountId,
      correlationId: fixture.financialAccountId,
    });
    output.push({
      tenantId: fixture.tenantId,
      customerId: fixture.customerId,
      financialAccountId: fixture.financialAccountId,
      accountNumber: fixture.accountNumber,
      collectionId: collection.collectionId,
      paymentId: collection.paymentId,
      status: collection.status,
      amountMinor: "250000",
      currency: "NGN",
    });
  }

  console.log(JSON.stringify({ fixture: "PR-01", payments: output }));
} finally {
  await database.destroy();
}
