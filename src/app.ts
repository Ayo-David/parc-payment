import express, { type Express } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import helmet from "helmet";
import type { PaystackWebhookService } from "./services/paystack-webhook-service.js";
import { z } from "zod";
import type {
  PaymentCustomerAuthenticator,
  PaymentCustomerPrincipal,
} from "./services/customer-token-authenticator.js";
import type { CustomerPaymentQueryService } from "./services/customer-payment-query-service.js";
import type { CustomerBillQueryService } from "./services/customer-bill-query-service.js";
import type { BillPaymentService } from "./services/bill-payment-service.js";
import type { BillCatalogueService } from "./services/bill-catalogue-service.js";

/** Builds the payment HTTP application with webhook and health routes. */
export function createApp(
  webhooks: PaystackWebhookService,
  customerApi?: {
    authenticator: PaymentCustomerAuthenticator;
    queries: CustomerPaymentQueryService;
    bills?: {
      commands: BillPaymentService;
      queries: CustomerBillQueryService;
    };
  },
  internalApi?: { serviceToken: string; catalogues: BillCatalogueService },
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
        const code =
          error instanceof Error ? error.message : "WEBHOOK_REJECTED";
        res
          .status(
            code === "INVALID_PAYSTACK_SIGNATURE"
              ? 401
              : code.includes("reused")
                ? 409
                : 400,
          )
          .json({ code });
      }
    },
  );
  app.use(express.json({ limit: "128kb" }));
  app.get("/health", (_req, res) =>
    res.json({ status: "UP", service: "parc-payment" }),
  );
  if (internalApi) {
    const internal = (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        !sameSecret(
          req.header("x-service-token") ?? "",
          internalApi.serviceToken,
        )
      )
        return void res.status(401).json({ code: "UNAUTHORIZED_SERVICE" });
      next();
    };
    app.post(
      "/internal/v1/tenants/:tenantId/bill-catalogue/imports",
      internal,
      async (req, res, next) => {
        try {
          const result = await internalApi.catalogues.importDraft({
            tenantId: z.string().uuid().parse(req.params.tenantId),
            actorId: z.string().uuid().parse(req.header("x-actor-id")),
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
      internal,
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
      internal,
      async (req, res, next) => {
        try {
          const body = z
            .object({ approval_id: z.string().uuid() })
            .strict()
            .parse(req.body);
          const result = await internalApi.catalogues.publish({
            tenantId: z.string().uuid().parse(req.params.tenantId),
            importId: z.string().uuid().parse(req.params.id),
            actorId: z.string().uuid().parse(req.header("x-actor-id")),
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
    const authenticate = async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      try {
        const authorization = req.header("authorization");
        if (!authorization) throw new Error("AUTHORIZATION_REQUIRED");
        const principal =
          await customerApi.authenticator.authenticate(authorization);
        if (req.header("x-tenant-id") !== principal.tenantId)
          return void res.status(403).json({ code: "TENANT_MISMATCH" });
        (
          req as express.Request & {
            paymentCustomer?: PaymentCustomerPrincipal;
          }
        ).paymentCustomer = principal;
        next();
      } catch {
        res.status(401).json({ code: "UNAUTHORIZED" });
      }
    };
    app.get("/v1/transactions", authenticate, async (req, res, next) => {
      try {
        const principal = paymentCustomer(req);
        const size = z.coerce
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .parse(req.query.page_size);
        res.json(
          await customerApi.queries.transactions(
            principal.tenantId,
            principal.customerId,
            size,
          ),
        );
      } catch (error) {
        next(error);
      }
    });
    app.get(
      "/v1/wallet/funding-details",
      authenticate,
      async (req, res, next) => {
        try {
          const principal = paymentCustomer(req);
          res.json(
            await customerApi.queries.fundingDetails(
              principal.tenantId,
              principal.customerId,
            ),
          );
        } catch (error) {
          next(error);
        }
      },
    );
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
      app.get("/v1/bills/products", authenticate, async (req, res, next) => {
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
        authenticate,
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
      app.post("/v1/bills/quotes", authenticate, async (req, res, next) => {
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
      app.post("/v1/bills", authenticate, async (req, res, next) => {
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
      app.get("/v1/bills/:id", authenticate, async (req, res, next) => {
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
      app.get("/v1/bills/:id/receipt", authenticate, async (req, res, next) => {
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
      });
    }
    app.get("/v1/transfers/:id", authenticate, async (req, res, next) => {
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
      authenticate,
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
              : message === "RECEIPT_NOT_READY"
                ? 409
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

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
