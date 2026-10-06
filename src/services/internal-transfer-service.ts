import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { LedgerTransferGateway } from "./ledger-gateway.js";

interface TransferRow {
  id: string;
  payment_id: string;
  source_ledger_account_id: string;
  destination_ledger_account_id: string;
  amount: string;
  currency: string;
  status: string;
  ledger_hold_id: string | null;
  ledger_transaction_id: string | null;
  request_hash: string;
}

export class InternalTransferService {
  public constructor(
    private readonly db: Knex,
    private readonly ledger: LedgerTransferGateway,
  ) {}

  public async transfer(input: {
    tenantId: string;
    customerId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amountMinor: string;
    currency: string;
    narration: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<{
    id: string;
    paymentId: string;
    status: string;
    ledgerTransactionId?: string;
    replayed: boolean;
  }> {
    if (!/^[1-9][0-9]*$/.test(input.amountMinor))
      throw new Error("Transfer amount must be positive integer minor units");
    if (input.currency !== "NGN")
      throw new Error("Currency is not operationally enabled");
    if (input.sourceAccountId === input.destinationAccountId)
      throw new Error("Source and destination accounts must differ");
    const requestHash = hash({
      customerId: input.customerId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      narration: input.narration,
    });
    let row = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("payment_internal_transfers")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<TransferRow>();
        if (existing) {
          if (existing.request_hash !== requestHash)
            throw new Error(
              "Idempotency key reused with different internal transfer",
            );
          return existing;
        }
        const source = await tx("financial_accounts")
          .where({
            tenant_id: input.tenantId,
            customer_id: input.customerId,
            currency: input.currency,
            status: "ACTIVE",
          })
          .whereNull("deleted_at")
          .andWhere((builder) =>
            builder
              .where("ledger_account_id", input.sourceAccountId)
              .orWhere("id", input.sourceAccountId),
          )
          .first<{
            id: string;
            customer_id: string;
            ledger_account_id: string | null;
          }>("id", "customer_id", "ledger_account_id");
        const destination = await tx("financial_accounts")
          .where({
            tenant_id: input.tenantId,
            id: input.destinationAccountId,
            currency: input.currency,
            status: "ACTIVE",
          })
          .whereNull("deleted_at")
          .first<{
            id: string;
            customer_id: string;
            ledger_account_id: string | null;
          }>("id", "customer_id", "ledger_account_id");
        if (!source?.ledger_account_id || !destination?.ledger_account_id)
          throw new Error(
            "Both internal-transfer accounts require Ledger mappings",
          );
        const paymentId = randomUUID();
        const transferId = randomUUID();
        await tx("payment_transactions").insert({
          id: paymentId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          source_account_id: source.id,
          payment_type: "INTERNAL_TRANSFER",
          channel: "MOBILE_APP",
          amount: input.amountMinor,
          currency: input.currency,
          status: "PENDING",
          reference: `INT-${transferId}`,
          narration: input.narration,
          idempotency_key: input.idempotencyKey,
          correlation_id: input.correlationId,
        });
        await tx("payment_internal_transfers").insert({
          id: transferId,
          tenant_id: input.tenantId,
          payment_id: paymentId,
          customer_id: input.customerId,
          source_account_id: source.id,
          destination_account_id: input.destinationAccountId,
          source_ledger_account_id: source.ledger_account_id,
          destination_ledger_account_id: destination.ledger_account_id,
          amount: input.amountMinor,
          currency: input.currency,
          narration: input.narration,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
          correlation_id: input.correlationId,
        });
        return (await tx("payment_internal_transfers")
          .where({ id: transferId })
          .first<TransferRow>())!;
      },
    );
    const replayed = row.status !== "CREATED";
    if (row.status === "SUCCEEDED") return result(row, true);
    if (row.status === "FAILED") return result(row, true);

    if (row.status === "CREATED") {
      try {
        const hold = await this.ledger.createHold({
          tenantId: input.tenantId,
          idempotencyKey: `internal-transfer:${row.id}:hold`,
          accountId: row.source_ledger_account_id,
          amountMinor: input.amountMinor,
          currency: input.currency,
          purpose: "INTERNAL_TRANSFER",
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        });
        await this.update(input.tenantId, row.id, "RESERVED", {
          ledger_hold_id: hold.holdId,
          reserved_at: this.db.fn.now(),
        });
        row = { ...row, status: "RESERVED", ledger_hold_id: hold.holdId };
      } catch (error) {
        await this.fail(input.tenantId, row, "HOLD_REJECTED", error);
        throw error;
      }
    }
    if (!row.ledger_hold_id)
      throw new Error("Reserved transfer has no Ledger hold");
    const holdId = row.ledger_hold_id;
    if (row.status === "RESERVED" || row.status === "MANUAL_REVIEW") {
      await this.update(input.tenantId, row.id, "CAPTURING", {
        failure_code: null,
        failure_reason: null,
      });
      row = { ...row, status: "CAPTURING" };
    }
    try {
      const captured = await this.ledger.captureHold({
        tenantId: input.tenantId,
        idempotencyKey: `internal-transfer:${row.id}:capture`,
        holdId,
        reference: `INT-${row.id}`,
        sourceAccountId: row.source_ledger_account_id,
        destinationAccountId: row.destination_ledger_account_id,
        amountMinor: input.amountMinor,
      });
      await withTenantTransaction(this.db, input.tenantId, async (tx) => {
        await tx("payment_internal_transfers")
          .where({ tenant_id: input.tenantId, id: row.id })
          .update({
            status: "SUCCEEDED",
            ledger_transaction_id: captured.transactionId,
            completed_at: tx.fn.now(),
          });
        await tx("payment_transactions")
          .where({ tenant_id: input.tenantId, id: row.payment_id })
          .update({ status: "SUCCESSFUL", processed_at: tx.fn.now() });
        await tx("payment_outbox_events")
          .insert({
            tenant_id: input.tenantId,
            aggregate_type: "payment_transaction",
            aggregate_id: row.payment_id,
            event_type: "payment.transfer-completed.v1",
            event_version: 1,
            idempotency_key: `internal-transfer:${row.id}:completed`,
            correlation_id: input.correlationId,
            payload: {
              payment_id: row.payment_id,
              ledger_transaction_id: captured.transactionId,
            },
          })
          .onConflict(["tenant_id", "idempotency_key"])
          .ignore();
      });
      return result(
        {
          ...row,
          status: "SUCCEEDED",
          ledger_transaction_id: captured.transactionId,
        },
        replayed || captured.replayed,
      );
    } catch (error) {
      await this.update(input.tenantId, row.id, "MANUAL_REVIEW", {
        failure_code: "CAPTURE_OUTCOME_UNCONFIRMED",
        failure_reason: safeError(error),
      });
      throw error;
    }
  }

  private update(
    tenantId: string,
    id: string,
    status: string,
    values: Record<string, unknown>,
  ): Promise<number> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("payment_internal_transfers")
        .where({ tenant_id: tenantId, id })
        .update({ status, ...values }),
    );
  }

  private async fail(
    tenantId: string,
    row: TransferRow,
    code: string,
    error: unknown,
  ): Promise<void> {
    await withTenantTransaction(this.db, tenantId, async (tx) => {
      await tx("payment_internal_transfers")
        .where({ tenant_id: tenantId, id: row.id })
        .update({
          status: "FAILED",
          failure_code: code,
          failure_reason: safeError(error),
          completed_at: tx.fn.now(),
        });
      await tx("payment_transactions")
        .where({ tenant_id: tenantId, id: row.payment_id })
        .update({
          status: "FAILED",
          failure_code: code,
          failure_reason: safeError(error),
          processed_at: tx.fn.now(),
        });
    });
  }
}

/** Maps a stored internal transfer to its public result shape. */
function result(row: TransferRow, replayed: boolean) {
  return {
    id: row.id,
    paymentId: row.payment_id,
    status: row.status,
    ...(row.ledger_transaction_id
      ? { ledgerTransactionId: row.ledger_transaction_id }
      : {}),
    replayed,
  };
}

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const safeError = (error: unknown): string =>
  error instanceof Error
    ? error.message.slice(0, 500)
    : "Ledger operation failed";
