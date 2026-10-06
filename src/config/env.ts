import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3004),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgresql:///parc_payment"),
  TENANT_ADMIN_URL: z.string().url().default("http://127.0.0.1:3002"),
  LEDGER_URL: z.string().url().default("http://127.0.0.1:3003"),
  AUTH_JWKS_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:3001/.well-known/jwks.json"),
  AUTH_JWT_ISSUER: z.string().url().default("https://auth.parc.invalid"),
  AUTH_TOKEN_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:3001/internal/v1/oauth/token"),
  SERVICE_CLIENT_KEY_ID: z.string().min(1),
  SERVICE_CLIENT_PRIVATE_KEY_BASE64: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(12),
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
  PAYSTACK_KEY_VERSION: z.string().min(1).default("default"),
  MONNIFY_API_KEY: z.string().min(8),
  MONNIFY_CLIENT_SECRET: z.string().min(12),
  MONNIFY_BASE_URL: z.string().url().default("https://sandbox.monnify.com"),
  BANKONE_AUTH_TOKEN: z.string().min(12).optional(),
  BANKONE_APPZONE_ACCOUNT: z.string().min(1).optional(),
  BANKONE_CHANNEL_BASE_URL: z.string().url().optional(),
  BANKONE_CORE_BASE_URL: z.string().url().optional(),
  BANKONE_INTERBANK_TSQ_PATH: z.string().startsWith("/").optional(),
  SERVICE_NAME: z.string().default("parc-payment"),
  BILL_INQUIRY_WORKER_ID: z.string().min(1).default("bill-inquiry-worker-1"),
  BILL_INQUIRY_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
});
export type AppConfig = z.infer<typeof schema>;
export const loadConfig = (): AppConfig => schema.parse(process.env);
