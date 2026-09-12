import express, { type Express } from "express";
import helmet from "helmet";
import type { PaystackWebhookService } from "./services/paystack-webhook-service.js";

/** Builds the payment HTTP application with webhook and health routes. */
export function createApp(webhooks: PaystackWebhookService): Express {
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
  return app;
}
