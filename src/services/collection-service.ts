import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { LedgerPostingGateway } from "./ledger-gateway.js";

export class CollectionService {
  public constructor(
    private readonly db: Knex,
    private readonly ledger: LedgerPostingGateway,
  ) {}

  public async confirm(input: {
    tenantId: string;
    providerCode: string;
    providerReference: string;
    providerAccountNumber: string;
    amountMinor: string;
    currency: string;
    payloadHash: string;
    webhookId?: string;
    providerPaidAt?: string;
    debitLedgerAccountId: string;
    creditLedgerAccountId: string;
    correlationId: string;
  }): Promise<{
    collectionId: string;
    paymentId: string;
    status: string;
    replayed: boolean;
  }> {
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Collection amount must be positive integer minor units");
    if (!/^[A-Fa-f0-9]{64}$/.test(input.payloadHash))
      throw new Error("Collection payload hash must be SHA-256");
    const prepared = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("payment_collections")
          .where({
            provider_code: input.providerCode,
            provider_reference: input.providerReference,
          })
          .first<{
            id: string;
            payment_id: string;
            payload_hash: string;
            amount: string;
            currency: string;
            status: string;
            ledger_idempotency_key: string;
          }>();
        if (existing) {
          if (
            existing.payload_hash !== input.payloadHash ||
            String(existing.amount) !== input.amountMinor ||
            existing.currency.trim() !== input.currency
          )
            throw new Error(
              "Provider collection reference reused with different evidence",
            );
          return { ...existing, replayed: true };
        }
        const account = await tx("financial_accounts as a")
          .join("account_providers as p", function () {
            this.on("p.id", "=", "a.provider_id").andOn(
              "p.tenant_id",
              "=",
              "a.tenant_id",
            );
          })
          .where({
            "a.tenant_id": input.tenantId,
            "a.account_number": input.providerAccountNumber,
            "a.currency": input.currency,
            "a.status": "ACTIVE",
            "p.provider_code": input.providerCode,
          })
          .first<{ id: string; customer_id: string }>("a.id", "a.customer_id");
        if (!account)
          throw new Error(
            "Collection account is not an active tenant provider account",
          );
        const collectionId = randomUUID();
        const paymentId = randomUUID();
        const ledgerKey = `collection:${input.providerCode}:${input.providerReference}`;
        await tx("payment_transactions").insert({
          id: paymentId,
          tenant_id: input.tenantId,
          customer_id: account.customer_id,
          payment_type: "ACCOUNT_FUNDING",
          channel: "SYSTEM",
          amount: input.amountMinor,
          currency: input.currency,
          status: "PROCESSING",
          reference: input.providerReference,
          idempotency_key: ledgerKey,
          correlation_id: input.correlationId,
          source_service: input.providerCode,
        });
        await tx("payment_collections").insert({
          id: collectionId,
          tenant_id: input.tenantId,
          financial_account_id: account.id,
          payment_id: paymentId,
          customer_id: account.customer_id,
          ...(input.webhookId ? { webhook_id: input.webhookId } : {}),
          provider_code: input.providerCode,
          provider_reference: input.providerReference,
          amount: input.amountMinor,
          currency: input.currency,
          payload_hash: input.payloadHash.toLowerCase(),
          debit_ledger_account_id: input.debitLedgerAccountId,
          credit_ledger_account_id: input.creditLedgerAccountId,
          ledger_idempotency_key: ledgerKey,
          ...(input.providerPaidAt
            ? { provider_paid_at: input.providerPaidAt }
            : {}),
        });
        return {
          id: collectionId,
          payment_id: paymentId,
          status: "VERIFIED",
          ledger_idempotency_key: ledgerKey,
          replayed: false,
        };
      },
    );
    if (prepared.status === "POSTED")
      return {
        collectionId: prepared.id,
        paymentId: prepared.payment_id,
        status: "POSTED",
        replayed: true,
      };
    await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("payment_collections")
        .where({ tenant_id: input.tenantId, id: prepared.id })
        .whereIn("status", ["VERIFIED", "MANUAL_REVIEW"])
        .update({
          status: "POSTING",
          failure_code: null,
          failure_reason: null,
        }),
    );
    try {
      const posting = await this.ledger.post({
        tenantId: input.tenantId,
        idempotencyKey: prepared.ledger_idempotency_key,
        reference: input.providerReference,
        currency: input.currency,
        debitAccountId: input.debitLedgerAccountId,
        creditAccountId: input.creditLedgerAccountId,
        amountMinor: input.amountMinor,
      });
      await withTenantTransaction(this.db, input.tenantId, async (tx) => {
        await tx("payment_collections")
          .where({ tenant_id: input.tenantId, id: prepared.id })
          .update({
            status: "POSTED",
            ledger_transaction_id: posting.transactionId,
            posted_at: tx.fn.now(),
          });
        await tx("payment_transactions")
          .where({ tenant_id: input.tenantId, id: prepared.payment_id })
          .update({ status: "SUCCESSFUL", processed_at: tx.fn.now() });
        await tx("payment_outbox_events")
          .insert({
            tenant_id: input.tenantId,
            aggregate_type: "payment_transaction",
            aggregate_id: prepared.payment_id,
            event_type: "payment.collection-confirmed.v1",
            event_version: 1,
            idempotency_key: prepared.ledger_idempotency_key,
            correlation_id: input.correlationId,
            payload: {
              payment_id: prepared.payment_id,
              provider_reference: input.providerReference,
              amount_minor: input.amountMinor,
              currency: input.currency,
            },
          })
          .onConflict(["tenant_id", "idempotency_key"])
          .ignore();
      });
      return {
        collectionId: prepared.id,
        paymentId: prepared.payment_id,
        status: "POSTED",
        replayed: prepared.replayed || posting.replayed,
      };
    } catch (error) {
      await withTenantTransaction(this.db, input.tenantId, (tx) =>
        tx("payment_collections")
          .where({ tenant_id: input.tenantId, id: prepared.id })
          .update({
            status: "MANUAL_REVIEW",
            failure_code: "LEDGER_POSTING_UNCONFIRMED",
            failure_reason: safeError(error),
          }),
      );
      throw error;
    }
  }
}

export const collectionPayloadHash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function safeError(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Ledger posting failed";
}
