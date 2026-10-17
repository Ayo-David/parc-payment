import express, { type Express } from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import type { PaystackWebhookService } from "./services/paystack-webhook-service.js";
import type { VirtualAccountAssignmentService } from "./services/virtual-account-assignment-service.js";
import type { TransferDirectoryProvider } from "./services/payment-provider.js";
import { z } from "zod";
import {
  principalOf,
  type AccessPolicy,
} from "./security/parc-service-auth.js";
import type { CustomerPaymentQueryService } from "./services/customer-payment-query-service.js";
import type { CustomerBillQueryService } from "./services/customer-bill-query-service.js";
import type { BillPaymentService } from "./services/bill-payment-service.js";
import type { BillCatalogueService } from "./services/bill-catalogue-service.js";
import type { ServicePayoutService } from "./services/service-payout-service.js";
import type { BeneficiaryService } from "./services/beneficiary-service.js";
import type { BankTransferService } from "./services/bank-transfer-service.js";

export interface PaymentCustomerPrincipal {
  tenantId: string;
  customerId: string;
}

/** Inbound Auth-issued token validation (see parc-service-auth). */
export interface PaymentAccess {
  require(policy: AccessPolicy): express.RequestHandler;
}

/** Payment endpoint permissions: the user and acting service from one token. */
export const paymentAccessPolicies = {
  customerRead: {
    scopes: ["payment.customer.read"],
    kinds: ["delegated"],
    subjectTypes: ["CUSTOMER"],
    actors: ["parc-mobile-bff"],
  },
  customerWrite: {
    scopes: ["payment.customer.write"],
    kinds: ["delegated"],
    subjectTypes: ["CUSTOMER"],
    actors: ["parc-mobile-bff"],
  },
  billCatalogue: {
    scopes: ["payment.bill-catalogue.manage"],
    kinds: ["delegated"],
    subjectTypes: ["ADMINISTRATOR"],
    actors: ["parc-admin-bff"],
  },
  lendingPayout: {
    scopes: ["payment.payouts.write"],
    kinds: ["service", "delegated"],
    actors: ["parc-lending"],
  },
} satisfies Record<string, AccessPolicy>;

/** Builds the payment HTTP application with webhook and health routes. */
export function createApp(
  webhooks: PaystackWebhookService,
  customerApi?: {
    access: PaymentAccess;
    queries: CustomerPaymentQueryService;
    beneficiaries?: BeneficiaryService;
    virtualAccounts?: VirtualAccountAssignmentService;
    /** Bank directory (Paystack), for the funding-account and transfer bank pickers. */
    banks?: Pick<TransferDirectoryProvider, "listBanks">;
    /** Name enquiry, quote and submit for customer bank transfers. */
    bankTransfers?: Pick<BankTransferService, "enquire" | "quote" | "submit">;
    bills?: {
      commands: BillPaymentService;
      queries: CustomerBillQueryService;
    };
  },
  internalApi?: {
    access: PaymentAccess;
    catalogues: BillCatalogueService;
    payouts: ServicePayoutService;
  },
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.post(
    "/v1/webhooks/paystack",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      try {
        if (!Buffer.isBuffer(req.body))
          return void res.status(400).json({ code: "INVALID_BODY" });
        const result = await webhooks.receive(
          req.body,
          req.header("x-paystack-signature") ?? "",
        );
        res
          .status(result.replayed ? 409 : 202)
          .json({ webhook_id: result.webhookId, replayed: result.replayed });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Only a malformed delivery is the sender's fault (4xx: Paystack stops
        // retrying). Anything unexpected is ours: 500 makes Paystack redeliver,
        // and the raw cause stays in our logs rather than in its dashboard.
        const status =
          message === "INVALID_PAYSTACK_SIGNATURE"
            ? 401
            : message.includes("reused")
              ? 409
              : malformedWebhook.has(message) || error instanceof SyntaxError
                ? 400
                : 500;
        logWebhookFailure(req, status, error);
        res.status(status).json({
          code: status === 500 ? "WEBHOOK_PROCESSING_FAILED" : message,
        });
      }
    },
  );
  app.use(express.json({ limit: "128kb" }));
  app.get("/health", (_req, res) =>
    res.json({ status: "UP", service: "parc-payment" }),
  );
  if (internalApi) {
    app.post(
      "/internal/v1/service-payouts",
      internalApi.access.require(paymentAccessPolicies.lendingPayout),
      async (req, res, next) => {
        try {
          const body = z
            .object({
              source_service: z.literal("parc-lending"),
              source_resource_id: z.string().uuid(),
              customer_id: z.string().uuid(),
              ledger_transaction_id: z.string().uuid(),
              destination_reference: z.string().min(1).max(255),
              amount_minor: z.string().regex(/^[1-9][0-9]*$/),
              currency: z.literal("NGN"),
              narration: z.string().min(1).max(140),
            })
            .strict()
            .parse(req.body);
          const principal = principalOf(req);
          if (!principal.tenantId)
            return void res
              .status(403)
              .json({ code: "TENANT_CONTEXT_REQUIRED" });
          if (
            principal.kind === "delegated" &&
            principal.subject?.type === "CUSTOMER" &&
            principal.subject.id !== body.customer_id
          )
            return void res.status(403).json({ code: "CUSTOMER_MISMATCH" });
          const result = await internalApi.payouts.submit({
            tenantId: principal.tenantId,
            sourceService: body.source_service,
            sourceResourceId: body.source_resource_id,
            customerId: body.customer_id,
            ledgerTransactionId: body.ledger_transaction_id,
            destinationReference: body.destination_reference,
            amountMinor: body.amount_minor,
            currency: body.currency,
            narration: body.narration,
            idempotencyKey: idempotency(req),
            correlationId: correlation(req),
            // Providers receive only the opaque destination reference. Payment
            // never reconstructs or persists the originating customer data.
            providerData: { destination_reference: body.destination_reference },
          });
          res.status(result.replayed ? 200 : 202).json(result);
        } catch (error) {
          next(error);
        }
      },
    );
    const internal: express.RequestHandler[] = [
      internalApi.access.require(paymentAccessPolicies.billCatalogue),
      (req, res, next) => {
        if (principalOf(req).tenantId !== req.params.tenantId)
          return void res.status(403).json({ code: "TENANT_MISMATCH" });
        next();
      },
    ];
    app.post(
      "/internal/v1/tenants/:tenantId/bill-catalogue/imports",
      ...internal,
      async (req, res, next) => {
        try {
          const result = await internalApi.catalogues.importDraft({
            tenantId: z.string().uuid().parse(req.params.tenantId),
            actorId: administratorId(req),
            idempotencyKey: idempotency(req),
          });
          res.status(result.replayed ? 200 : 201).json(result);
        } catch (error) {
          next(error);
        }
      },
    );
    app.get(
      "/internal/v1/tenants/:tenantId/bill-catalogue/imports/:id/publication-binding",
      ...internal,
      async (req, res, next) => {
        try {
          res.json(
            await internalApi.catalogues.publicationBinding(
              z.string().uuid().parse(req.params.tenantId),
              z.string().uuid().parse(req.params.id),
            ),
          );
        } catch (error) {
          next(error);
        }
      },
    );
    app.post(
      "/internal/v1/tenants/:tenantId/bill-catalogue/imports/:id/publications",
      ...internal,
      async (req, res, next) => {
        try {
          const body = z
            .object({ approval_id: z.string().uuid() })
            .strict()
            .parse(req.body);
          const result = await internalApi.catalogues.publish({
            tenantId: z.string().uuid().parse(req.params.tenantId),
            importId: z.string().uuid().parse(req.params.id),
            actorId: administratorId(req),
            approvalId: body.approval_id,
            idempotencyKey: idempotency(req),
            correlationId: correlation(req),
          });
          res.status(result.replayed ? 200 : 201).json(result);
        } catch (error) {
          next(error);
        }
      },
    );
  }
  if (customerApi) {
    const customer = (policy: AccessPolicy): express.RequestHandler[] => [
      customerApi.access.require(policy),
      (req, res, next) => {
        const { subject, tenantId } = principalOf(req);
        if (!subject || !tenantId)
          return void res
            .status(403)
            .json({ code: "CUSTOMER_CONTEXT_REQUIRED" });
        (
          req as express.Request & {
            paymentCustomer?: PaymentCustomerPrincipal;
          }
        ).paymentCustomer = { tenantId, customerId: subject.id };
        next();
      },
    ];
    const customerRead = customer(paymentAccessPolicies.customerRead);
    const customerWrite = customer(paymentAccessPolicies.customerWrite);
    app.get("/v1/transactions", ...customerRead, async (req, res, next) => {
      try {
        const principal = paymentCustomer(req);
        const size = z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .parse(req.query.page_size);
        const cursor = z
          .string()
          .min(1)
          .max(500)
          .optional()
          .parse(req.query.page_cursor);
        res.json(
          await customerApi.queries.transactions(
            principal.tenantId,
            principal.customerId,
            size,
            cursor,
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    if (customerApi.beneficiaries) {
      const beneficiaries = customerApi.beneficiaries;
      app.get("/v1/beneficiaries", ...customerRead, async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          const kind = z
            .enum(["all", "recent", "favourite"])
            .default("all")
            .parse(req.query.kind);
          res.json(
            await beneficiaries.list(
              principal.tenantId,
              principal.customerId,
              kind,
            ),
          );
        } catch (error) {
          next(error);
        }
      });
      app.post(
        "/v1/beneficiaries",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = z
              .object({
                bank_code: z.string().regex(/^[0-9A-Za-z]{3,20}$/),
                account_number: z.string().regex(/^[0-9]{10}$/),
                name: z.string().trim().min(2).max(200),
              })
              .strict()
              .parse(req.body);
            const result = await beneficiaries.create({
              tenantId: principal.tenantId,
              customerId: principal.customerId,
              bankCode: body.bank_code,
              accountNumber: body.account_number,
              name: body.name,
              idempotencyKey: idempotency(req),
            });
            res.status(result.status).json(result.body);
          } catch (error) {
            next(error);
          }
        },
      );
    }
    app.get(
      "/v1/wallet/funding-details",
      ...customerRead,
      async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          try {
            res.json(
              await customerApi.queries.fundingDetails(
                principal.tenantId,
                principal.customerId,
              ),
            );
            return;
          } catch (error) {
            if (
              !(error instanceof Error) ||
              error.message !== "FUNDING_ACCOUNT_NOT_FOUND" ||
              !customerApi.virtualAccounts
            )
              throw error;
          }
          // No active account yet: say whether one is being opened.
          const state = await customerApi.virtualAccounts.state(
            principal.tenantId,
            principal.customerId,
          );
          if (state.status === "PENDING")
            return void res.status(409).json({
              code: "FUNDING_ACCOUNT_PENDING",
              message: "Your account number is being set up",
            });
          if (state.status === "FAILED")
            return void res.status(422).json({
              code: "FUNDING_ACCOUNT_REJECTED",
              message: state.reason,
            });
          res.status(404).json({
            code: "FUNDING_ACCOUNT_NOT_FOUND",
            message: "No account number has been set up yet",
          });
        } catch (error) {
          next(error);
        }
      },
    );
    if (customerApi.banks) {
      const directory = customerApi.banks;
      // The list changes rarely; refresh at most every six hours.
      let cached:
        | {
            at: number;
            banks: Promise<{ bank_code: string; bank_name: string }[]>;
          }
        | undefined;
      app.get(
        "/v1/reference/banks",
        ...customerRead,
        async (_req, res, next) => {
          try {
            if (!cached || Date.now() - cached.at > 6 * 60 * 60_000) {
              const banks = directory.listBanks().then((list) =>
                list
                  .filter((bank) => bank.active)
                  .map((bank) => ({
                    bank_code: bank.code,
                    bank_name: bank.name,
                  }))
                  .sort((a, b) => a.bank_name.localeCompare(b.bank_name)),
              );
              cached = { at: Date.now(), banks };
              banks.catch(() => {
                cached = undefined;
              });
            }
            res.json({ banks: await cached.banks });
          } catch (error) {
            next(error);
          }
        },
      );
    }
    if (customerApi.bankTransfers) {
      const bankTransfers = customerApi.bankTransfers;
      const destination = {
        bank_code: z.string().regex(/^[0-9]{3,10}$/),
        account_number: z.string().regex(/^[0-9]{10}$/),
      };
      const minor = z.string().regex(/^[1-9][0-9]*$/);
      app.post(
        "/v1/transfers/name-enquiries",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = z.object(destination).strict().parse(req.body);
            res.json(
              await bankTransfers.enquire({
                tenantId: principal.tenantId,
                customerId: principal.customerId,
                bankCode: body.bank_code,
                accountNumber: body.account_number,
                idempotencyKey: idempotency(req),
                correlationId: correlation(req),
              }),
            );
          } catch (error) {
            next(error);
          }
        },
      );
      app.post(
        "/v1/transfers/quotes",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = z
              .object({
                enquiry_token: z.string().min(16),
                amount_minor: minor,
                currency: z.string().regex(/^[A-Z]{3}$/),
                narration: z.string().min(1).max(100).optional(),
              })
              .strict()
              .parse(req.body);
            res.json(
              await bankTransfers.quote({
                tenantId: principal.tenantId,
                customerId: principal.customerId,
                enquiryToken: body.enquiry_token,
                amountMinor: body.amount_minor,
                currency: body.currency,
                ...(body.narration ? { narration: body.narration } : {}),
                idempotencyKey: idempotency(req),
              }),
            );
          } catch (error) {
            next(error);
          }
        },
      );
      app.post(
        "/v1/transfers/bank",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = z
              .object({
                ...destination,
                quote_id: z.string().uuid(),
                source_account_id: z.string().uuid(),
                amount_minor: minor,
                currency: z.string().regex(/^[A-Z]{3}$/),
                narration: z.string().min(1).max(100),
              })
              .strict()
              .parse(req.body);
            const result = await bankTransfers.submit({
              tenantId: principal.tenantId,
              customerId: principal.customerId,
              quoteId: body.quote_id,
              sourceAccountId: body.source_account_id,
              bankCode: body.bank_code,
              accountNumber: body.account_number,
              amountMinor: body.amount_minor,
              currency: body.currency,
              narration: body.narration,
              idempotencyKey: idempotency(req),
              correlationId: correlation(req),
            });
            res.status(result.replayed ? 200 : 202).json(result);
          } catch (error) {
            next(error);
          }
        },
      );
    }
    if (customerApi.virtualAccounts) {
      const virtualAccounts = customerApi.virtualAccounts;
      app.post(
        "/v1/wallet/virtual-account",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = z
              .object({
                // Optional: the BVN verified at onboarding is used when on file.
                bvn: z
                  .string()
                  .regex(/^[0-9]{11}$/)
                  .optional(),
                bank_code: z.string().regex(/^[0-9A-Za-z]{3,20}$/),
                account_number: z.string().regex(/^[0-9]{10}$/),
                // Supplied by the Mobile BFF from Ledger, never by the client.
                ledger_account_id: z.string().uuid(),
              })
              .strict()
              .parse(req.body);
            const state = await virtualAccounts
              .request({
                tenantId: principal.tenantId,
                customerId: principal.customerId,
                ledgerAccountId: body.ledger_account_id,
                ...(body.bvn ? { bvn: body.bvn } : {}),
                bankCode: body.bank_code,
                accountNumber: body.account_number,
                idempotencyKey: idempotency(req),
                correlationId: correlation(req),
              })
              .catch((error: unknown) => {
                if (error instanceof Error && error.message === "BVN_REQUIRED")
                  return undefined;
                throw error;
              });
            if (!state)
              return void res.status(422).json({
                code: "BVN_REQUIRED",
                message: "Enter your BVN to get your account number",
              });
            if (state.status === "FAILED")
              return void res.status(422).json({
                code: "FUNDING_ACCOUNT_REJECTED",
                message: state.reason,
              });
            res
              .status(state.status === "ACTIVE" ? 200 : 202)
              .json({ status: state.status });
          } catch (error) {
            next(error);
          }
        },
      );
    }
    if (customerApi.bills) {
      const billValidation = z
        .object({
          customer_id: z.string().uuid(),
          product_id: z.string().uuid(),
          customer_identifier: z.string().min(3).max(200),
        })
        .strict();
      const billQuote = billValidation
        .extend({
          amount_minor: z.string().regex(/^[1-9][0-9]*$/),
          currency: z.literal("NGN"),
        })
        .strict();
      const billPayment = z
        .object({
          customer_id: z.string().uuid(),
          source_account_id: z.string().uuid(),
          quote_id: z.string().uuid(),
          customer_identifier: z.string().min(3).max(200),
        })
        .strict();
      app.get("/v1/bills/products", ...customerRead, async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          const category = z
            .enum(["airtime", "data", "electricity", "cable_tv", "internet"])
            .parse(req.query.category);
          res.json({
            products: await customerApi.bills!.queries.listProducts(
              principal.tenantId,
              category,
            ),
          });
        } catch (error) {
          next(error);
        }
      });
      app.post(
        "/v1/bills/customer-validations",
        ...customerWrite,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            const body = billValidation.parse(req.body);
            assertCustomer(principal, body.customer_id);
            res.json(
              await customerApi.bills!.commands.validateCustomer({
                tenantId: principal.tenantId,
                customerId: principal.customerId,
                productId: body.product_id,
                customerIdentifier: body.customer_identifier,
                idempotencyKey: idempotency(req),
                correlationId: correlation(req),
              }),
            );
          } catch (error) {
            next(error);
          }
        },
      );
      app.post("/v1/bills/quotes", ...customerWrite, async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          const body = billQuote.parse(req.body);
          assertCustomer(principal, body.customer_id);
          res.json(
            await customerApi.bills!.commands.createQuote({
              tenantId: principal.tenantId,
              customerId: principal.customerId,
              productId: body.product_id,
              customerIdentifier: body.customer_identifier,
              amountMinor: body.amount_minor,
              idempotencyKey: idempotency(req),
              correlationId: correlation(req),
            }),
          );
        } catch (error) {
          next(error);
        }
      });
      app.post("/v1/bills", ...customerWrite, async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          const body = billPayment.parse(req.body);
          assertCustomer(principal, body.customer_id);
          const result = await customerApi.bills!.commands.pay({
            tenantId: principal.tenantId,
            customerId: principal.customerId,
            sourceAccountId: body.source_account_id,
            quoteId: body.quote_id,
            customerIdentifier: body.customer_identifier,
            idempotencyKey: idempotency(req),
            correlationId: correlation(req),
          });
          res.status(202).json(result);
        } catch (error) {
          next(error);
        }
      });
      app.get("/v1/bills/:id", ...customerRead, async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          res.json(
            await customerApi.bills!.queries.get(
              principal.tenantId,
              principal.customerId,
              z.string().uuid().parse(req.params.id),
              false,
            ),
          );
        } catch (error) {
          next(error);
        }
      });
      app.get(
        "/v1/bills/:id/receipt",
        ...customerRead,
        async (req, res, next) => {
          try {
            const principal = paymentCustomer(req);
            res.json(
              await customerApi.bills!.queries.get(
                principal.tenantId,
                principal.customerId,
                z.string().uuid().parse(req.params.id),
                true,
              ),
            );
          } catch (error) {
            next(error);
          }
        },
      );
    }
    app.get("/v1/transfers/:id", ...customerRead, async (req, res, next) => {
      try {
        const principal = paymentCustomer(req);
        res.json(
          await customerApi.queries.transfer(
            principal.tenantId,
            principal.customerId,
            z.string().uuid().parse(req.params.id),
            false,
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    app.get(
      "/v1/transfers/:id/receipt",
      ...customerRead,
      async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          res.json(
            await customerApi.queries.transfer(
              principal.tenantId,
              principal.customerId,
              z.string().uuid().parse(req.params.id),
              true,
            ),
          );
        } catch (error) {
          next(error);
        }
      },
    );
  }
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
      res
        .status(
          message === "CUSTOMER_MISMATCH"
            ? 403
            : message.endsWith("NOT_FOUND")
              ? 404
              : message === "RECEIPT_NOT_READY" ||
                  message === "IDEMPOTENCY_KEY_REUSED" ||
                  message === "TRANSFER_QUOTE_USED"
                ? 409
                : message === "INVALID_PAGE_CURSOR" ||
                    unprocessableTransfer.has(message)
                  ? 422
                  : error instanceof z.ZodError
                    ? 422
                    : message.includes("unavailable") ||
                        message.includes("not configured")
                      ? 503
                      : 500,
        )
        .json({ code: message });
    },
  );
  return app;
}

function assertCustomer(
  principal: PaymentCustomerPrincipal,
  customerId: string,
): void {
  if (principal.customerId !== customerId) throw new Error("CUSTOMER_MISMATCH");
}

function idempotency(req: express.Request): string {
  return z.string().min(1).max(255).parse(req.header("idempotency-key"));
}

/** Customer bank transfer refusals the client can act on (re-quote, top up). */
const unprocessableTransfer = new Set([
  "ACCOUNT_RESOLUTION_FAILED",
  "INSUFFICIENT_FUNDS",
  "TRANSFER_ENQUIRY_EXPIRED",
  "TRANSFER_LIMIT_EXCEEDED",
  "TRANSFER_PROVIDER_CHANGED",
  "TRANSFER_QUOTE_EXPIRED",
  "TRANSFER_QUOTE_MISMATCH",
]);

const malformedWebhook = new Set([
  "INVALID_PAYSTACK_EVENT",
  "INVALID_PAYSTACK_EVENT_IDENTITY",
]);

/**
 * One JSON line per rejected webhook so a failed delivery in the Paystack
 * dashboard can be traced. Never logs the payload, headers or signature.
 */
function logWebhookFailure(
  req: express.Request,
  status: number,
  error: unknown,
): void {
  const cause = error instanceof Error ? error.cause : undefined;
  console.error(
    JSON.stringify({
      level: status >= 500 ? "error" : "warn",
      time: new Date().toISOString(),
      msg: "Paystack webhook rejected",
      correlation_id: req.header("x-correlation-id") ?? null,
      status,
      error: error instanceof Error ? error.message : String(error),
      ...(cause !== undefined
        ? { cause: cause instanceof Error ? cause.message : String(cause) }
        : {}),
    }),
  );
}

function correlation(req: express.Request): string {
  return z
    .string()
    .uuid()
    .default(() => randomUUID())
    .parse(req.header("x-correlation-id"));
}

function paymentCustomer(req: express.Request): PaymentCustomerPrincipal {
  const principal = (
    req as express.Request & { paymentCustomer?: PaymentCustomerPrincipal }
  ).paymentCustomer;
  if (!principal) throw new Error("UNAUTHORIZED");
  return principal;
}

/** The acting administrator comes from the delegated token, never a header. */
function administratorId(req: express.Request): string {
  const subject = principalOf(req).subject;
  if (subject?.type !== "ADMINISTRATOR") throw new Error("UNAUTHORIZED");
  return subject.id;
}
