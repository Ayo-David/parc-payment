import type { Knex } from "knex";
import { withTenantTransaction } from "../database/client.js";
import type { ExternalTransferService } from "./external-transfer-service.js";
import type { ProviderRegistry } from "./payment-provider.js";

interface InquiryClaim {
  attempt_id: string;
  tenant_id: string;
  external_transfer_id: string;
  provider_code: string;
  provider_reference: string;
}

export class PaymentInquiryWorker {
  public constructor(
    private readonly db: Knex,
    private readonly registry: ProviderRegistry,
    private readonly transfers: ExternalTransferService,
    private readonly workerId: string,
  ) {}

  public async runBatch(limit = 25): Promise<number> {
    const result = await this.db.raw<{ rows: InquiryClaim[] }>(
      "SELECT * FROM public.claim_due_payment_inquiries(?,?,?)",
      [this.workerId, limit, 60],
    );
    for (const claim of result.rows) await this.process(claim);
    return result.rows.length;
  }

  private async process(claim: InquiryClaim): Promise<void> {
    const provider = this.registry.require(
      claim.provider_code,
      "INTERBANK_TRANSFER",
      "NGN",
    );
    try {
      await this.transfers.inquire({
        tenantId: claim.tenant_id,
        transferId: claim.external_transfer_id,
        provider,
        correlationId: claim.attempt_id,
      });
      await withTenantTransaction(this.db, claim.tenant_id, (tx) =>
        tx("payment_attempts")
          .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
          .update({ inquiry_lease_expires_at: null }),
      );
    } catch (error) {
      await withTenantTransaction(this.db, claim.tenant_id, async (tx) => {
        const attempt = await tx("payment_attempts")
          .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
          .first<{ inquiry_attempts: number }>("inquiry_attempts");
        const exhausted = (attempt?.inquiry_attempts ?? 0) >= 5;
        await tx("payment_attempts")
          .where({ tenant_id: claim.tenant_id, id: claim.attempt_id })
          .update({
            inquiry_lease_expires_at: null,
            next_inquiry_at: exhausted ? null : new Date(Date.now() + 60_000),
            failure_reason:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Inquiry failed",
          });
        if (exhausted)
          await tx("payment_external_transfers")
            .where({
              tenant_id: claim.tenant_id,
              id: claim.external_transfer_id,
              status: "PENDING",
            })
            .update({
              status: "MANUAL_REVIEW",
              failure_code: "INQUIRY_RETRIES_EXHAUSTED",
              failure_reason:
                "Provider outcome unresolved after five inquiries",
            });
      });
    }
  }
}
