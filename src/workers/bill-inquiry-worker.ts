import { loadConfig } from "../config/env.js";
import { createDatabase } from "../database/client.js";
import { BillPaymentProviderRegistry } from "../services/bill-payment-provider.js";
import { BillPaymentInquiryWorker } from "../services/bill-payment-inquiry-worker.js";
import { HttpLedgerPostingGateway } from "../services/ledger-gateway.js";
import { MonnifyBillPaymentProvider } from "../services/monnify-bill-payment-provider.js";
import pino from "pino";

const config = loadConfig();
const database = createDatabase(config);
const logger = pino({ name: "parc-payment-bill-inquiry" });
const providers = new BillPaymentProviderRegistry();
providers.register(
  new MonnifyBillPaymentProvider(
    config.MONNIFY_BASE_URL,
    config.MONNIFY_API_KEY,
    config.MONNIFY_CLIENT_SECRET,
  ),
);
const worker = new BillPaymentInquiryWorker(
  database,
  providers,
  new HttpLedgerPostingGateway(config.LEDGER_URL, config.LEDGER_SERVICE_TOKEN),
  config.BILL_INQUIRY_WORKER_ID,
);

let stopping = false;
async function run(): Promise<void> {
  while (!stopping) {
    try {
      await worker.runBatch();
    } catch (error) {
      logger.error(
        { err: error },
        "Bill inquiry batch failed; the lease will expire for retry",
      );
    }
    await new Promise<void>((resolve) =>
      setTimeout(resolve, config.BILL_INQUIRY_INTERVAL_MS),
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
