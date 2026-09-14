import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./database/client.js";
import { PaystackWebhookService } from "./services/paystack-webhook-service.js";
import { HttpPaymentCustomerAuthenticator } from "./services/customer-token-authenticator.js";
import { CustomerPaymentQueryService } from "./services/customer-payment-query-service.js";
import { CustomerBillQueryService } from "./services/customer-bill-query-service.js";
import { BillPaymentProviderRegistry } from "./services/bill-payment-provider.js";
import { MonnifyBillPaymentProvider } from "./services/monnify-bill-payment-provider.js";
import { ProviderRegistry } from "./services/payment-provider.js";
import { ProviderRoutingService } from "./services/provider-routing-service.js";
import {
  TenantAdminApprovalGateway,
  TenantAdminProviderGateway,
} from "./services/tenant-admin-provider-gateway.js";
import { HttpLedgerPostingGateway } from "./services/ledger-gateway.js";
import { BillPaymentService } from "./services/bill-payment-service.js";
import { BillCatalogueService } from "./services/bill-catalogue-service.js";
const config = loadConfig();
const database = createDatabase(config);
const monnify = new MonnifyBillPaymentProvider(
  config.MONNIFY_BASE_URL,
  config.MONNIFY_API_KEY,
  config.MONNIFY_CLIENT_SECRET,
);
const billProviders = new BillPaymentProviderRegistry();
billProviders.register(monnify);
const paymentProviders = new ProviderRegistry();
paymentProviders.register(monnify);
const routing = new ProviderRoutingService(
  database,
  new TenantAdminProviderGateway(
    config.TENANT_ADMIN_URL,
    config.TENANT_ADMIN_SERVICE_TOKEN,
  ),
  paymentProviders,
);
const billCommands = new BillPaymentService(
  database,
  routing,
  billProviders,
  new HttpLedgerPostingGateway(config.LEDGER_URL, config.LEDGER_SERVICE_TOKEN),
);
const server = createServer(
  createApp(
    new PaystackWebhookService(
      database,
      config.PAYSTACK_SECRET_KEY,
      config.PAYSTACK_KEY_VERSION,
    ),
    {
      authenticator: new HttpPaymentCustomerAuthenticator(
        config.AUTH_CUSTOMER_URL,
        config.AUTH_CUSTOMER_SERVICE_TOKEN ?? config.TENANT_ADMIN_SERVICE_TOKEN,
      ),
      queries: new CustomerPaymentQueryService(database),
      bills: {
        commands: billCommands,
        queries: new CustomerBillQueryService(database),
      },
    },
    {
      serviceToken: config.PAYMENT_ADMIN_SERVICE_TOKEN,
      catalogues: new BillCatalogueService(
        database,
        monnify,
        new TenantAdminApprovalGateway(
          config.TENANT_ADMIN_URL,
          config.TENANT_ADMIN_SERVICE_TOKEN,
        ),
      ),
    },
  ),
);
server.listen(config.PORT, config.HOST);
process.on("SIGTERM", () => {
  server.close();
  void database.destroy();
});
