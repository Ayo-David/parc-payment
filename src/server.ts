import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./database/client.js";
import { PaystackWebhookService } from "./services/paystack-webhook-service.js";
import {
  createParcAuth,
  ParcTokenClient,
} from "./security/parc-service-auth.js";
import { CustomerPaymentQueryService } from "./services/customer-payment-query-service.js";
import { BeneficiaryService } from "./services/beneficiary-service.js";
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
import { ServicePayoutService } from "./services/service-payout-service.js";
import { PaystackProvider } from "./services/paystack-provider.js";
import { VirtualAccountAssignmentService } from "./services/virtual-account-assignment-service.js";
import { AuthCustomerProfileGateway } from "./services/customer-profile-gateway.js";
import { CollectionService } from "./services/collection-service.js";
import { DepositService } from "./services/deposit-service.js";
import { ExternalTransferService } from "./services/external-transfer-service.js";
import { PaymentReversalService } from "./services/payment-reversal-service.js";
import { TransferOutcomeService } from "./services/transfer-outcome-service.js";
import { BankTransferService } from "./services/bank-transfer-service.js";
const config = loadConfig();
const database = createDatabase(config);
const tokens = await ParcTokenClient.fromBase64Key({
  tokenUrl: config.AUTH_TOKEN_URL,
  issuer: config.AUTH_JWT_ISSUER,
  clientId: config.SERVICE_NAME,
  keyId: config.SERVICE_CLIENT_KEY_ID,
  privateKeyBase64: config.SERVICE_CLIENT_PRIVATE_KEY_BASE64,
});
const access = createParcAuth({
  issuer: config.AUTH_JWT_ISSUER,
  audience: config.SERVICE_NAME,
  jwksUrl: config.AUTH_JWKS_URL,
});
const monnify = new MonnifyBillPaymentProvider(
  config.MONNIFY_BASE_URL,
  config.MONNIFY_API_KEY,
  config.MONNIFY_CLIENT_SECRET,
);
const billProviders = new BillPaymentProviderRegistry();
billProviders.register(monnify);
const paymentProviders = new ProviderRegistry();
paymentProviders.register(monnify);
const paystack = new PaystackProvider(
  config.PAYSTACK_SECRET_KEY,
  config.PAYSTACK_BASE_URL,
  fetch,
  config.PAYSTACK_DVA_PREFERRED_BANK ??
    (config.PAYSTACK_SECRET_KEY.startsWith("sk_test_")
      ? "test-bank"
      : "titan-paystack"),
);
paymentProviders.register(paystack);
const ledger = new HttpLedgerPostingGateway(config.LEDGER_URL, tokens);
const deposits = new DepositService(
  database,
  paystack,
  ledger,
  new CollectionService(database, ledger),
);
const routing = new ProviderRoutingService(
  database,
  new TenantAdminProviderGateway(config.TENANT_ADMIN_URL, tokens),
  paymentProviders,
);
const externalTransfers = new ExternalTransferService(
  database,
  routing,
  ledger,
);
const transferOutcomes = new TransferOutcomeService(
  database,
  paystack,
  externalTransfers,
  new PaymentReversalService(database, ledger),
);
const virtualAccounts = new VirtualAccountAssignmentService(
  database,
  routing,
  new AuthCustomerProfileGateway(config.AUTH_CUSTOMER_URL, tokens),
);
const billCommands = new BillPaymentService(
  database,
  routing,
  billProviders,
  ledger,
);
const server = createServer(
  createApp(
    new PaystackWebhookService(
      database,
      config.PAYSTACK_SECRET_KEY,
      config.PAYSTACK_KEY_VERSION,
      virtualAccounts,
      deposits,
      transferOutcomes,
    ),
    {
      access,
      queries: new CustomerPaymentQueryService(database),
      beneficiaries: new BeneficiaryService(database),
      virtualAccounts,
      banks: paystack,
      bankTransfers: new BankTransferService(
        database,
        routing,
        externalTransfers,
        ledger,
        {
          flatFeeMinor: config.TRANSFER_FLAT_FEE_MINOR,
          maxAmountMinor: config.TRANSFER_MAX_AMOUNT_MINOR,
        },
      ),
      bills: {
        commands: billCommands,
        queries: new CustomerBillQueryService(database),
      },
    },
    {
      access,
      catalogues: new BillCatalogueService(
        database,
        monnify,
        new TenantAdminApprovalGateway(config.TENANT_ADMIN_URL, tokens),
      ),
      payouts: new ServicePayoutService(database, routing),
    },
  ),
);
server.listen(config.PORT, config.HOST);
process.on("SIGTERM", () => {
  server.close();
  void database.destroy();
});
