import type { Knex } from "knex";
import { z } from "zod";
import { withTenantTransaction } from "../database/client.js";
import type { ExternalTransferService } from "./external-transfer-service.js";
import type { PaymentProvider } from "./payment-provider.js";
import type { PaymentReversalService } from "./payment-reversal-service.js";

const transferEvents = new Set([
  "transfer.success",
  "transfer.failed",
  "transfer.reversed",
]);

/** True for a Paystack event about the outcome of one of our transfers. */
export function isTransferEvent(event: string): boolean {
  return transferEvents.has(event);
}

/** Ledger reversal authority for money Paystack returned after a success. */
export const PAYSTACK_TRANSFER_REVERSAL_RULE = "PAYSTACK_TRANSFER_REVERSED";

const transferPayload = z
  .object({ reference: z.string().min(1) })
  .passthrough();
const ourReference =
  /^parc-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/**
 * Settles a customer bank transfer from a provider webhook. The webhook only
 * says the transfer changed: ExternalTransferService.inquire asks the
 * provider's verify API for the outcome and applies it (capture the hold on
 * success, release it on failure or a reversal before success), so a forged
 * or stale body can never move money and a redelivery is a no-op.
 *
 * A reversal after success means the Ledger already moved the customer's
 * money out, so it is reversed back to them once the provider confirms it.
 */
export class TransferOutcomeService {
  public constructor(
    private readonly db: Knex,
    private readonly provider: PaymentProvider,
    private readonly transfers: Pick<ExternalTransferService, "inquire">,
    private readonly reversals: Pick<PaymentReversalService, "reverse">,
  ) {}

  /** Returns false when the reference isn't one of our customer transfers. */
  public async applyWebhook(input: {
    event: string;
    data: unknown;
    webhookId: string;
  }): Promise<boolean> {
    const { reference } = transferPayload.parse(input.data);
    const transferId = ourReference.exec(reference)?.[1];
    if (!transferId) return false;
    const resolved = await this.db.raw<{ rows: { tenant_id: string }[] }>(
      "SELECT * FROM public.resolve_external_transfer(?, ?)",
      [this.provider.code, transferId],
    );
    const tenantId = resolved.rows[0]?.tenant_id;
    if (!tenantId) return false;
    const result = await this.transfers.inquire({
      tenantId,
      transferId,
      provider: this.provider,
      correlationId: input.webhookId,
    });
    if (input.event === "transfer.reversed" && result.status === "SUCCEEDED")
      await this.reverseSettled(
        tenantId,
        transferId,
        reference,
        input.webhookId,
      );
    return true;
  }

  private async reverseSettled(
    tenantId: string,
    transferId: string,
    reference: string,
    correlationId: string,
  ): Promise<void> {
    const verified = await this.provider.inquire(reference, {
      capability: "INTERBANK_TRANSFER",
    });
    if (verified.providerStatus !== "reversed")
      throw new Error("Provider has not confirmed this transfer reversal");
    const row = await withTenantTransaction(this.db, tenantId, (tx) =>
      tx("payment_external_transfers")
        .where({ tenant_id: tenantId, id: transferId })
        .first<{
          payment_id: string;
          amount: string;
          currency: string;
          ledger_transaction_id: string | null;
        }>(),
    );
    if (!row?.ledger_transaction_id)
      throw new Error("Settled transfer has no Ledger transaction to reverse");
    await this.reversals.reverse({
      tenantId,
      paymentId: row.payment_id,
      originalLedgerTransactionId: row.ledger_transaction_id,
      amountMinor: String(row.amount),
      currency: row.currency.trim(),
      reason: "Provider reversed the transfer after reporting success",
      idempotencyKey: `external-transfer:${transferId}:provider-reversal`,
      correlationId,
      automatedRuleId: PAYSTACK_TRANSFER_REVERSAL_RULE,
    });
    await withTenantTransaction(this.db, tenantId, (tx) =>
      tx("payment_external_transfers")
        .where({ tenant_id: tenantId, id: transferId, status: "SUCCEEDED" })
        .update({
          status: "REVERSED",
          failure_code: "PROVIDER_REVERSED",
          failure_reason: "Provider reversed the transfer after success",
          completed_at: tx.fn.now(),
        }),
    );
  }
}
