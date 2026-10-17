import { loadConfig } from "../config/env.js";
import { createDatabase } from "../database/client.js";
import { ExternalTransferService } from "../services/external-transfer-service.js";
import { HttpLedgerPostingGateway } from "../services/ledger-gateway.js";
import { MonnifyBillPaymentProvider } from "../services/monnify-bill-payment-provider.js";
import { ProviderRegistry } from "../services/payment-provider.js";
import { PaymentInquiryWorker } from "../services/payment-inquiry-worker.js";
import { PaystackProvider } from "../services/paystack-provider.js";
import { ProviderRoutingService } from "../services/provider-routing-service.js";
import { TenantAdminProviderGateway } from "../services/tenant-admin-provider-gateway.js";
import pino from "pino";
import { ParcTokenClient } from "../security/parc-service-auth.js";

/**
 * Follows up customer bank transfers whose provider outcome is pending or
 * ambiguous. Webhooks usually settle them first; this covers a missed or
 * delayed delivery.
 */
const config = loadConfig();
const database = createDatabase(config);
const logger = pino({ name: "parc-payment-inquiry" });
// Background worker: service-only tokens.
const tokens = await ParcTokenClient.fromBase64Key({
  tokenUrl: config.AUTH_TOKEN_URL,
  issuer: config.AUTH_JWT_ISSUER,
  clientId: config.SERVICE_NAME,
  keyId: config.SERVICE_CLIENT_KEY_ID,
  privateKeyBase64: config.SERVICE_CLIENT_PRIVATE_KEY_BASE64,
});
const providers = new ProviderRegistry();
providers.register(
  new MonnifyBillPaymentProvider(
    config.MONNIFY_BASE_URL,
    config.MONNIFY_API_KEY,
    config.MONNIFY_CLIENT_SECRET,
  ),
);
providers.register(
  new PaystackProvider(config.PAYSTACK_SECRET_KEY, config.PAYSTACK_BASE_URL),
);
const worker = new PaymentInquiryWorker(
  database,
  providers,
  new ExternalTransferService(
    database,
    new ProviderRoutingService(
      database,
      new TenantAdminProviderGateway(config.TENANT_ADMIN_URL, tokens),
      providers,
    ),
    new HttpLedgerPostingGateway(config.LEDGER_URL, tokens),
  ),
  config.PAYMENT_INQUIRY_WORKER_ID,
);

let stopping = false;
async function run(): Promise<void> {
  while (!stopping) {
    try {
      await worker.runBatch();
    } catch (error) {
      logger.error(
        { err: error },
        "Payment inquiry batch failed; the lease will expire for retry",
      );
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, config.PAYMENT_INQUIRY_INTERVAL_MS),
    );
  }
  await database.destroy();
}

process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
await run();
