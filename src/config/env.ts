import { z } from "zod";
/** Optional setting where a blank value (e.g. `KEY=` in a docker env file) means unset. */
const optional = <T extends z.ZodTypeAny>(type: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), type.optional());
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
  /** Dedicated account partner bank; defaults to "test-bank" for sk_test_ keys, else "titan-paystack". */
  PAYSTACK_DVA_PREFERRED_BANK: optional(z.string().min(1)),
  /** Auth Customer, for the customer's legal name and contacts when opening provider accounts. */
  AUTH_CUSTOMER_URL: z.string().url().default("http://127.0.0.1:3001"),
  MONNIFY_API_KEY: z.string().min(8),
  MONNIFY_CLIENT_SECRET: z.string().min(12),
  MONNIFY_BASE_URL: z.string().url().default("https://sandbox.monnify.com"),
  BANKONE_AUTH_TOKEN: optional(z.string().min(12)),
  BANKONE_APPZONE_ACCOUNT: optional(z.string().min(1)),
  BANKONE_CHANNEL_BASE_URL: optional(z.string().url()),
  BANKONE_CORE_BASE_URL: optional(z.string().url()),
  BANKONE_INTERBANK_TSQ_PATH: optional(z.string().startsWith("/")),
  SERVICE_NAME: z.string().default("parc-payment"),
  BILL_INQUIRY_WORKER_ID: z.string().min(1).default("bill-inquiry-worker-1"),
  BILL_INQUIRY_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
  /** Flat fee, in kobo, on every customer bank transfer (until Tenant Admin owns it). */
  TRANSFER_FLAT_FEE_MINOR: z
    .string()
    .regex(/^(0|[1-9][0-9]*)$/)
    .default("5000"),
  /** Largest single customer bank transfer, in kobo. */
  TRANSFER_MAX_AMOUNT_MINOR: z
    .string()
    .regex(/^[1-9][0-9]*$/)
    .default("100000000"),
  PAYMENT_INQUIRY_WORKER_ID: z
    .string()
    .min(1)
    .default("payment-inquiry-worker-1"),
  PAYMENT_INQUIRY_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
});
export type AppConfig = z.infer<typeof schema>;
export const loadConfig = (): AppConfig => schema.parse(process.env);
