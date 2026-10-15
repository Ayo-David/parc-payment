import { createHash, randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { z } from "zod";
import { withTenantTransaction } from "../database/client.js";
import type { CustomerProfileGateway } from "./customer-profile-gateway.js";
import {
  canAssignVirtualAccounts,
  ProviderRejectedError,
} from "./payment-provider.js";
import type { ProviderRoutingService } from "./provider-routing-service.js";

export type FundingAccountState =
  | { status: "NONE" }
  | { status: "PENDING" }
  | { status: "ACTIVE" }
  | { status: "FAILED"; reason: string };

/** Paystack names these inconsistently across its docs, so accept both spellings. */
const assignSucceeded = new Set([
  "dedicatedaccount.assign.success",
  "assigndedicatedaccount.success",
]);
const assignFailed = new Set([
  "dedicatedaccount.assign.failed",
  "assigndedicatedaccount.failed",
  "customeridentification.failed",
]);

export function isVirtualAccountAssignmentEvent(event: string): boolean {
  return assignSucceeded.has(event) || assignFailed.has(event);
}

const assignmentPayload = z
  .object({
    email: z.string().optional(),
    reason: z.string().optional(),
    customer: z
      .object({
        email: z.string().optional(),
        customer_code: z.string().optional(),
      })
      .passthrough()
      .optional(),
    dedicated_account: z
      .object({
        id: z.union([z.number(), z.string()]).optional(),
        account_number: z.string().optional(),
        account_name: z.string().optional(),
        bank: z
          .object({ name: z.string().optional(), slug: z.string().optional() })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * The value stored to match a provider webhook back to its request without
 * keeping the customer's email: Paystack echoes the email we sent.
 */
export function customerReference(email: string): string {
  return `email-sha256:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`;
}

const OPEN_STATUSES = ["PENDING", "SUBMITTED", "MANUAL_REVIEW"];

/**
 * Opens the customer's funding (dedicated virtual) account on first need.
 * The provider validates the BVN against a bank account the customer owns,
 * then reports the outcome by webhook; until then the request is SUBMITTED.
 * The BVN comes from Auth (verified at onboarding); the customer types one
 * only when none is on file. BVN and bank details pass straight through to
 * the provider and are never stored or logged here.
 */
export class VirtualAccountAssignmentService {
  public constructor(
    private readonly db: Knex,
    private readonly routing: ProviderRoutingService,
    private readonly profiles: CustomerProfileGateway,
  ) {}

  public async request(input: {
    tenantId: string;
    customerId: string;
    ledgerAccountId: string;
    /** Only needed when Auth has no BVN on file for the customer. */
    bvn?: string;
    bankCode: string;
    accountNumber: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<FundingAccountState> {
    const current = await this.state(input.tenantId, input.customerId);
    if (current.status === "ACTIVE" || current.status === "PENDING")
      return current;
    const { holder, bvn: storedBvn } = await this.profiles.profile(
      input.tenantId,
      input.customerId,
    );
    const bvn = storedBvn ?? input.bvn;
    if (!bvn) throw new Error("BVN_REQUIRED");
    const routed = await this.routing
      .select({
        tenantId: input.tenantId,
        capability: "VIRTUAL_ACCOUNT",
        currency: "NGN",
        correlationId: input.correlationId,
        idempotencyKey: `virtual-account:${input.idempotencyKey}`,
      })
      .catch(() => {
        throw new Error("VIRTUAL_ACCOUNT_PROVIDER_NOT_CONFIGURED");
      });
    const provider = routed.provider;
    if (!canAssignVirtualAccounts(provider))
      throw new Error("VIRTUAL_ACCOUNT_PROVIDER_NOT_CONFIGURED");

    const prepared = await withTenantTransaction(
      this.db,
      input.tenantId,
      async (tx) => {
        // One open request per customer, even under concurrent taps.
        await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [
          `virtual-account-assign:${input.tenantId}:${input.customerId}`,
        ]);
        const open = await tx("virtual_account_provisioning_requests")
          .where({ tenant_id: input.tenantId, customer_id: input.customerId })
          .whereIn("status", [...OPEN_STATUSES, "ACTIVE"])
          .first<{ status: string } | undefined>("status");
        if (open) return undefined;
        const providerRow = await this.tenantProvider(
          tx,
          input.tenantId,
          provider.code,
        );
        const accountId = randomUUID();
        const requestId = randomUUID();
        await tx("financial_accounts").insert({
          id: accountId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          provider_id: providerRow.id,
          account_type: "VIRTUAL_BANK_ACCOUNT",
          account_name: [holder.firstName, holder.lastName].join(" "),
          currency: "NGN",
          status: "PENDING",
          is_primary: true,
          ledger_account_id: input.ledgerAccountId,
        });
        await tx("virtual_account_provisioning_requests").insert({
          id: requestId,
          tenant_id: input.tenantId,
          customer_id: input.customerId,
          financial_account_id: accountId,
          routing_decision_id: routed.decisionId,
          provider_code: provider.code,
          currency: "NGN",
          idempotency_key: input.idempotencyKey,
          request_hash: createHash("sha256")
            .update(
              JSON.stringify({
                customerId: input.customerId,
                provider: provider.code,
                decision: routed.decisionId,
              }),
            )
            .digest("hex"),
          status: "SUBMITTED",
          submitted_at: tx.fn.now(),
          provider_customer_reference: customerReference(holder.email),
        });
        return { requestId, accountId };
      },
    );
    if (!prepared) return this.state(input.tenantId, input.customerId);

    try {
      await provider.assignVirtualAccount({
        holder,
        bvn,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
      });
      return { status: "PENDING" };
    } catch (error) {
      const rejected = error instanceof ProviderRejectedError;
      const reason = rejected
        ? error.message
        : "We couldn't reach our banking partner. Please try again.";
      await this.fail(input.tenantId, prepared, {
        code: rejected ? "PROVIDER_REJECTED" : "PROVIDER_UNAVAILABLE",
        reason,
      });
      return { status: "FAILED", reason };
    }
  }

  /**
   * Payment's record of the provider for this tenant, created on first use.
   * Tenant Admin's routing decision is what authorizes the provider; this
   * row only anchors the tenant's provider accounts. A tenant-wide lock
   * keeps concurrent first requests from creating two (the table has no
   * unique key on tenant + provider).
   */
  private async tenantProvider(
    tx: Knex.Transaction,
    tenantId: string,
    providerCode: string,
  ): Promise<{ id: string }> {
    const find = () =>
      tx("account_providers")
        .where({ tenant_id: tenantId, provider_code: providerCode })
        .whereNull("deleted_at")
        .first<{ id: string; is_active: boolean } | undefined>(
          "id",
          "is_active",
        );
    const existing = await find();
    if (existing) {
      // An operator deactivated it deliberately; don't silently revive it.
      if (!existing.is_active)
        throw new Error("VIRTUAL_ACCOUNT_PROVIDER_NOT_CONFIGURED");
      return existing;
    }
    await tx.raw("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", [
      `account-provider:${tenantId}:${providerCode}`,
    ]);
    const raced = await find();
    if (raced) return raced;
    const [created] = await tx("account_providers")
      .insert({
        tenant_id: tenantId,
        provider_code: providerCode,
        provider_name:
          providerCode.charAt(0) + providerCode.slice(1).toLowerCase(),
        provider_type: "PAYMENT_PROCESSOR",
        is_active: true,
      })
      .returning<{ id: string }[]>("id");
    if (!created) throw new Error("Provider record was not created");
    return created;
  }

  /** The customer's funding account as the app should present it. */
  public state(
    tenantId: string,
    customerId: string,
  ): Promise<FundingAccountState> {
    return withTenantTransaction(this.db, tenantId, async (tx) => {
      const latest = await tx("virtual_account_provisioning_requests")
        .where({ tenant_id: tenantId, customer_id: customerId })
        .orderBy("created_at", "desc")
        .first<{ status: string; failure_reason: string | null } | undefined>(
          "status",
          "failure_reason",
        );
      if (!latest) return { status: "NONE" };
      if (latest.status === "ACTIVE") return { status: "ACTIVE" };
      if (OPEN_STATUSES.includes(latest.status)) return { status: "PENDING" };
      return {
        status: "FAILED",
        reason:
          latest.failure_reason ??
          "We couldn't open your account number. Please check your details and try again.",
      };
    });
  }

  /**
   * Applies a verified Paystack assignment webhook. Idempotent: only a request
   * still awaiting its outcome is changed, so redeliveries are harmless.
   * Returns false when the webhook matches no request of ours.
   */
  public async applyWebhook(event: string, data: unknown): Promise<boolean> {
    const payload = assignmentPayload.parse(data ?? {});
    const email = payload.customer?.email ?? payload.email;
    if (!email) return false;
    const resolved = await this.db.raw<{
      rows: { tenant_id: string; request_id: string }[];
    }>("SELECT * FROM public.resolve_virtual_account_assignment(?, ?)", [
      "PAYSTACK",
      customerReference(email),
    ]);
    const match = resolved.rows[0];
    if (!match) return false;
    if (assignFailed.has(event)) {
      const request = await withTenantTransaction(
        this.db,
        match.tenant_id,
        (tx) =>
          tx("virtual_account_provisioning_requests")
            .where({ tenant_id: match.tenant_id, id: match.request_id })
            .first<{ financial_account_id: string }>("financial_account_id"),
      );
      if (request)
        await this.fail(
          match.tenant_id,
          {
            requestId: match.request_id,
            accountId: request.financial_account_id,
          },
          {
            code: "PROVIDER_REJECTED",
            reason: friendlyRejection(payload.reason),
          },
        );
      return true;
    }
    const account = payload.dedicated_account;
    if (!account?.account_number)
      throw new Error("Assignment webhook carried no account number");
    const accountNumber = account.account_number;
    await withTenantTransaction(this.db, match.tenant_id, async (tx) => {
      const request = await tx("virtual_account_provisioning_requests")
        .where({ tenant_id: match.tenant_id, id: match.request_id })
        .whereIn("status", OPEN_STATUSES)
        .first<
          | {
              financial_account_id: string;
              provider_code: string;
            }
          | undefined
        >("financial_account_id", "provider_code");
      if (!request) return;
      const providerRow = await tx("account_providers")
        .where({
          tenant_id: match.tenant_id,
          provider_code: request.provider_code,
        })
        .first<{ id: string }>("id");
      if (!providerRow) throw new Error("Provider configuration disappeared");
      const providerAccountId = String(account.id ?? accountNumber);
      await tx("financial_accounts")
        .where({ tenant_id: match.tenant_id, id: request.financial_account_id })
        .update({
          account_number: accountNumber,
          ...(account.account_name
            ? { account_name: account.account_name }
            : {}),
          bank_name: account.bank?.name ?? "Paystack",
          bank_code: account.bank?.slug ?? null,
          provider_reference: providerAccountId,
          status: "ACTIVE",
          updated_at: tx.fn.now(),
        });
      await tx("account_provider_accounts")
        .insert({
          tenant_id: match.tenant_id,
          account_id: request.financial_account_id,
          provider_id: providerRow.id,
          provider_account_id: providerAccountId,
          provider_account_number: accountNumber,
          provider_metadata: payload.customer?.customer_code
            ? { customer_code: payload.customer.customer_code }
            : {},
        })
        .onConflict(["provider_id", "provider_account_id"])
        .ignore();
      await tx("virtual_account_provisioning_requests")
        .where({ tenant_id: match.tenant_id, id: match.request_id })
        .update({
          status: "ACTIVE",
          provider_account_reference: providerAccountId,
          completed_at: tx.fn.now(),
          updated_at: tx.fn.now(),
        });
    });
    return true;
  }

  private async fail(
    tenantId: string,
    request: { requestId: string; accountId: string },
    failure: { code: string; reason: string },
  ): Promise<void> {
    await withTenantTransaction(this.db, tenantId, async (tx) => {
      const updated = await tx("virtual_account_provisioning_requests")
        .where({ tenant_id: tenantId, id: request.requestId })
        .whereIn("status", OPEN_STATUSES)
        .update({
          status: "FAILED",
          failure_code: failure.code,
          failure_reason: failure.reason,
          completed_at: tx.fn.now(),
          updated_at: tx.fn.now(),
        });
      if (updated)
        await tx("financial_accounts")
          .where({ tenant_id: tenantId, id: request.accountId })
          // Release the wallet link (unique per ledger account) so a retry can claim it.
          .update({
            status: "CLOSED",
            ledger_account_id: null,
            updated_at: tx.fn.now(),
          });
    });
  }
}

/** Paystack's reasons are terse ("Account number or BVN is incorrect"); keep them, bounded. */
function friendlyRejection(reason: string | undefined): string {
  const trimmed = reason?.trim();
  return trimmed
    ? `${trimmed.slice(0, 200)}. Check your BVN and bank account, then try again.`
    : "Your BVN and bank account couldn't be validated. Check them and try again.";
}
