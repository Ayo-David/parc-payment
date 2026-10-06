import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { LedgerTransferGateway } from "./ledger-gateway.js";
import { ProviderOutcomeAmbiguousError } from "./payment-provider.js";
import type {
  PaymentProvider,
  ProviderSubmission,
} from "./payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

interface ExternalRow {
  id: string;
  payment_id: string;
  source_ledger_account_id: string;
  settlement_ledger_account_id: string;
  amount: string;
  currency: string;
  status: string;
  ledger_hold_id: string | null;
  ledger_transaction_id: string | null;
  active_attempt_id: string | null;
  request_hash: string;
}

export class ExternalTransferService {
  public constructor(
    private readonly db: Knex,
    private readonly routing: ProviderRoutingService,
    private readonly ledger: LedgerTransferGateway,
  ) {}

  public async initiate(input: {
    tenantId: string;
    customerId: string;
    sourceAccountId: string;
    settlementLedgerAccountId: string;
    beneficiaryId?: string;
    beneficiaryName: string;
    destinationAccountNumber: string;
    destinationBankCode: string;
    destinationBankName?: string;
    destinationPhoneNumber?: string;
    amountMinor: string;
    currency: string;
    narration: string;
    idempotencyKey: string;
    correlationId: string;
    providerData: unknown;
  }): Promise<{
    id: string;
    paymentId: string;
    status: string;
    replayed: boolean;
  }> {
    validate(input);
    const routed = await this.routing.select({
      tenantId: input.tenantId,
      capability: "INTERBANK_TRANSFER",
      currency: input.currency,
      correlationId: input.correlationId,
      idempotencyKey: `external-transfer:${input.idempotencyKey}:route`,
    });
    const requestHash = hash({
      customerId: input.customerId,
      sourceAccountId: input.sourceAccountId,
      settlementLedgerAccountId: input.settlementLedgerAccountId,
      beneficiaryId: input.beneficiaryId ?? null,
      beneficiaryName: input.beneficiaryName,
      destinationAccountNumber: input.destinationAccountNumber,
      destinationBankCode: input.destinationBankCode,
      amountMinor: input.amountMinor,
      currency: input.currency,
      narration: input.narration,
      provider: routed.provider.code,
      routingDecisionId: routed.decisionId,
    });
    let row = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        const existing = await tx("payment_external_transfers")
          .where({
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          })
          .first<ExternalRow>();
        if (existing) {
          if (existing.request_hash !== requestHash)
            throw new Error(
              "Idempotency key reused with different external transfer",
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
          .first<{ id: string; ledger_account_id: string | null }>(
            "id",
            "ledger_account_id",
          );
        if (!source?.ledger_account_id)
          throw new Error("Source account requires an active Ledger mapping");
        if (input.beneficiaryId) {
          const beneficiary = await tx("beneficiaries")
            .where({
              tenant_id: input.tenantId,
              id: input.beneficiaryId,
              customer_id: input.customerId,
            })
            .whereNull("deleted_at")
            .first("id");
          if (!beneficiary)
            throw new Error("Beneficiary is unavailable to this customer");
        }
        const paymentId = randomUUID();
        const transferId = randomUUID();
        await tx("payment_transactions").insert({
          id: paymentId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          source_account_id: source.id,
          ...(input.beneficiaryId
            ? { beneficiary_id: input.beneficiaryId }
            : {}),
          payment_type: "BANK_TRANSFER",
          channel: "MOBILE_APP",
          amount: input.amountMinor,
          currency: input.currency,
          status: "PENDING",
          reference: `EXT-${transferId}`,
          narration: input.narration,
          idempotency_key: input.idempotencyKey,
          correlation_id: input.correlationId,
        });
        await tx("payment_external_transfers").insert({
          id: transferId,
          tenant_id: input.tenantId,
          payment_id: paymentId,
          customer_id: input.customerId,
          source_account_id: source.id,
          source_ledger_account_id: source.ledger_account_id,
          settlement_ledger_account_id: input.settlementLedgerAccountId,
          ...(input.beneficiaryId
            ? { beneficiary_id: input.beneficiaryId }
            : {}),
          beneficiary_name: input.beneficiaryName,
          destination_account_number: input.destinationAccountNumber,
          destination_bank_code: input.destinationBankCode,
          ...(input.destinationBankName
            ? { destination_bank_name: input.destinationBankName }
            : {}),
          ...(input.destinationPhoneNumber
            ? { destination_phone_number: input.destinationPhoneNumber }
            : {}),
          amount: input.amountMinor,
          currency: input.currency,
          narration: input.narration,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
          correlation_id: input.correlationId,
        });
        return (await tx("payment_external_transfers")
          .where({ id: transferId })
          .first<ExternalRow>())!;
      },
    );
    if (["SUCCEEDED", "FAILED", "REVERSED"].includes(row.status))
      return transferResult(row, true);
    if (row.status !== "CREATED") return transferResult(row, true);
    let holdId: string;
    try {
      const hold = await this.ledger.createHold({
        tenantId: input.tenantId,
        idempotencyKey: `external-transfer:${row.id}:hold`,
        accountId: row.source_ledger_account_id,
        amountMinor: input.amountMinor,
        currency: input.currency,
        purpose: "EXTERNAL_TRANSFER",
        expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      });
      holdId = hold.holdId;
      await this.update(input.tenantId, row.id, "RESERVED", {
        ledger_hold_id: holdId,
        reserved_at: this.db.fn.now(),
      });
    } catch (error) {
      await this.finalFailure(input.tenantId, row, "HOLD_REJECTED", error);
      throw error;
    }
    const attemptId = randomUUID();
    await withTenantTransaction(this.db, input.tenantId, async (tx) => {
      await tx("payment_attempts").insert({
        id: attemptId,
        tenant_id: input.tenantId,
        payment_id: row.payment_id,
        external_transfer_id: row.id,
        attempt_number: 1,
        status: "PROCESSING",
        provider_code: routed.provider.code,
        routing_decision_id: routed.decisionId,
        request_hash: requestHash,
        request_payload: redactedRequest(input),
        submission_state: "SUBMITTED",
        outcome_certainty: "AMBIGUOUS",
        outcome_class: "AMBIGUOUS",
        started_at: tx.fn.now(),
        next_inquiry_at: new Date(Date.now() + 30_000),
      });
      await tx("payment_external_transfers")
        .where({ tenant_id: input.tenantId, id: row.id })
        .update({
          status: "SUBMITTING",
          active_attempt_id: attemptId,
          submitted_at: tx.fn.now(),
        });
    });
    row = {
      ...row,
      status: "SUBMITTING",
      ledger_hold_id: holdId,
      active_attempt_id: attemptId,
    };
    try {
      const submission = await routed.provider.submit({
        operationId: row.id,
        capability: "INTERBANK_TRANSFER",
        currency: input.currency,
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey,
        providerData: input.providerData,
      });
      return await this.applyOutcome(
        input,
        row,
        routed.provider,
        submission,
        false,
      );
    } catch (error) {
      if (error instanceof ProviderOutcomeAmbiguousError) {
        await this.pending(
          input.tenantId,
          row,
          "AMBIGUOUS",
          undefined,
          error.message,
        );
        return {
          id: row.id,
          paymentId: row.payment_id,
          status: "PENDING",
          replayed: false,
        };
      }
      await this.pending(
        input.tenantId,
        row,
        "AMBIGUOUS",
        undefined,
        "Unclassified provider exception",
      );
      throw error;
    }
  }

  public async inquire(input: {
    tenantId: string;
    transferId: string;
    provider: PaymentProvider;
    correlationId: string;
  }): Promise<{
    id: string;
    paymentId: string;
    status: string;
    replayed: boolean;
  }> {
    const row = await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("payment_external_transfers")
        .where({ tenant_id: input.tenantId, id: input.transferId })
        .first<ExternalRow>(),
    );
    if (!row) throw new Error("External transfer not found");
    if (["SUCCEEDED", "FAILED", "REVERSED"].includes(row.status))
      return transferResult(row, true);
    const attempt = await withTenantTransaction(this.db, input.tenantId, (tx) =>
      tx("payment_attempts")
        .where({ tenant_id: input.tenantId, id: row.active_attempt_id })
        .first<{
          provider_reference: string | null;
          inquiry_attempts: number;
        }>(),
    );
    if (!attempt?.provider_reference)
      throw new Error("Provider reference unavailable for inquiry");
    const outcome = await input.provider.inquire(attempt.provider_reference, {
      capability: "INTERBANK_TRANSFER",
      amountMinor: String(row.amount),
      transactionDate: new Date().toISOString().slice(0, 10),
      transactionType: "InterbankTransfer",
    });
    return this.applyOutcome(
      {
        tenantId: input.tenantId,
        amountMinor: String(row.amount),
        currency: row.currency.trim(),
        correlationId: input.correlationId,
      },
      row,
      input.provider,
      outcome,
      true,
    );
  }

  private async applyOutcome(
    input: {
      tenantId: string;
      amountMinor: string;
      currency: string;
      correlationId: string;
    },
    row: ExternalRow,
    provider: PaymentProvider,
    outcome: ProviderSubmission,
    replayed: boolean,
  ) {
    if (outcome.state === "PENDING") {
      await this.pending(
        input.tenantId,
        row,
        "ACKNOWLEDGED_PENDING",
        outcome.providerReference,
        outcome.providerStatus,
      );
      return {
        id: row.id,
        paymentId: row.payment_id,
        status: "PENDING",
        replayed,
      };
    }
    if (outcome.state === "FAILED") {
      await this.attempt(input.tenantId, row, "FINAL_FAILURE", outcome);
      if (!row.ledger_hold_id)
        throw new Error("External transfer has no hold to release");
      await this.ledger.releaseHold({
        tenantId: input.tenantId,
        idempotencyKey: `external-transfer:${row.id}:release`,
        holdId: row.ledger_hold_id,
      });
      await this.finalFailure(
        input.tenantId,
        row,
        "PROVIDER_FINAL_FAILURE",
        new Error(outcome.providerStatus ?? "Provider failed"),
      );
      return {
        id: row.id,
        paymentId: row.payment_id,
        status: "FAILED",
        replayed,
      };
    }
    await this.attempt(input.tenantId, row, "FINAL_SUCCESS", outcome);
    if (!row.ledger_hold_id)
      throw new Error("External transfer has no hold to capture");
    let capture: { transactionId: string; replayed: boolean };
    try {
      capture = await this.ledger.captureHold({
        tenantId: input.tenantId,
        idempotencyKey: `external-transfer:${row.id}:capture`,
        holdId: row.ledger_hold_id,
        reference: `EXT-${row.id}`,
        sourceAccountId: row.source_ledger_account_id,
        destinationAccountId: row.settlement_ledger_account_id,
        amountMinor: input.amountMinor,
      });
    } catch (error) {
      await this.update(input.tenantId, row.id, "MANUAL_REVIEW", {
        failure_code: "LEDGER_CAPTURE_UNCONFIRMED",
        failure_reason: safeError(error),
      });
      throw error;
    }
    await withTenantTransaction(this.db, input.tenantId, async (tx) => {
      await tx("payment_external_transfers")
        .where({ tenant_id: input.tenantId, id: row.id })
        .update({
          status: "SUCCEEDED",
          ledger_transaction_id: capture.transactionId,
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
          idempotency_key: `external-transfer:${row.id}:completed`,
          correlation_id: input.correlationId,
          payload: {
            payment_id: row.payment_id,
            ledger_transaction_id: capture.transactionId,
          },
        })
        .onConflict(["tenant_id", "idempotency_key"])
        .ignore();
    });
    return {
      id: row.id,
      paymentId: row.payment_id,
      status: "SUCCEEDED",
      replayed: replayed || capture.replayed,
    };
  }

  private pending(
    tenantId: string,
    row: ExternalRow,
    outcomeClass: string,
    reference?: string,
    status?: string,
  ): Promise<void> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      await tx("payment_attempts")
        .where({ tenant_id: tenantId, id: row.active_attempt_id })
        .update({
          status: "PENDING",
          outcome_class: outcomeClass,
          outcome_certainty:
            outcomeClass === "AMBIGUOUS" ? "AMBIGUOUS" : "KNOWN",
          ...(reference ? { provider_reference: reference } : {}),
          response_payload: status ? { provider_status: status } : {},
          next_inquiry_at: new Date(Date.now() + 30_000),
        });
      await tx("payment_external_transfers")
        .where({ tenant_id: tenantId, id: row.id })
        .update({ status: "PENDING" });
    });
  }

  private attempt(
    tenantId: string,
    row: ExternalRow,
    outcomeClass: string,
    outcome: ProviderSubmission,
  ): Promise<number> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("payment_attempts")
        .where({ tenant_id: tenantId, id: row.active_attempt_id })
        .update({
          status: outcome.state === "SUCCESS" ? "SUCCESSFUL" : "FAILED",
          outcome_class: outcomeClass,
          outcome_certainty: "KNOWN",
          submission_state: "ACKNOWLEDGED",
          provider_reference: outcome.providerReference,
          response_payload: {
            provider_status: outcome.providerStatus ?? outcome.state,
          },
          completed_at: tx.fn.now(),
          next_inquiry_at: null,
        }),
    );
  }

  private update(
    tenantId: string,
    id: string,
    status: string,
    values: Record<string, unknown>,
  ): Promise<number> {
    return withTenantTransaction(this.db, tenantId, (tx) =>
      tx("payment_external_transfers")
        .where({ tenant_id: tenantId, id })
        .update({ status, ...values }),
    );
  }

  private async finalFailure(
    tenantId: string,
    row: ExternalRow,
    code: string,
    error: unknown,
  ): Promise<void> {
    await withTenantTransaction(this.db, tenantId, async (tx) => {
      await tx("payment_external_transfers")
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

/** Validates the supported amount, currency, destination, and narration format. */
function validate(input: {
  amountMinor: string;
  currency: string;
  narration: string;
  destinationAccountNumber: string;
}): void {
  if (!/^[1-9][0-9]*$/.test(input.amountMinor))
    throw new Error("Transfer amount must be positive integer minor units");
  if (input.currency !== "NGN")
    throw new Error("Currency is not operationally enabled");
  if (!/^\d{10,20}$/.test(input.destinationAccountNumber))
    throw new Error("Destination account number is invalid");
  if (!input.narration || input.narration.length > 100)
    throw new Error("Transfer narration is invalid");
}
const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const safeError = (error: unknown): string =>
  error instanceof Error
    ? error.message.slice(0, 500)
    : "Provider operation failed";
const redactedRequest = (input: {
  destinationAccountNumber: string;
  destinationBankCode: string;
  amountMinor: string;
  currency: string;
}) => ({
  destination_account_suffix: input.destinationAccountNumber.slice(-4),
  destination_bank_code: input.destinationBankCode,
  amount_minor: input.amountMinor,
  currency: input.currency,
});
const transferResult = (row: ExternalRow, replayed: boolean) => ({
  id: row.id,
  paymentId: row.payment_id,
  status: row.status,
  replayed,
});
