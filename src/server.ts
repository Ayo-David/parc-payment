import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./database/client.js";
import { PaystackWebhookService } from "./services/paystack-webhook-service.js";
const config = loadConfig();
const database = createDatabase(config);
const server = createServer(
  createApp(
    new PaystackWebhookService(
      database,
      config.PAYSTACK_SECRET_KEY,
      config.PAYSTACK_KEY_VERSION,
    ),
  ),
);
server.listen(config.PORT, config.HOST);
process.on("SIGTERM", () => {
  server.close();
  void database.destroy();
});
