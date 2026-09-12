import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3004),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgresql:///parc_payment"),
  TENANT_ADMIN_URL: z.string().url().default("http://127.0.0.1:3002"),
  TENANT_ADMIN_SERVICE_TOKEN: z.string().min(24),
  PAYSTACK_SECRET_KEY: z.string().min(12),
  PAYSTACK_BASE_URL: z.string().url().default("https://api.paystack.co"),
  PAYSTACK_KEY_VERSION: z.string().min(1).default("default"),
  BANKONE_AUTH_TOKEN: z.string().min(12).optional(),
  BANKONE_APPZONE_ACCOUNT: z.string().min(1).optional(),
  BANKONE_CHANNEL_BASE_URL: z.string().url().optional(),
  BANKONE_CORE_BASE_URL: z.string().url().optional(),
  BANKONE_INTERBANK_TSQ_PATH: z.string().startsWith("/").optional(),
  SERVICE_NAME: z.string().default("parc-payment"),
});
export type AppConfig = z.infer<typeof schema>;
export const loadConfig = (): AppConfig => schema.parse(process.env);
