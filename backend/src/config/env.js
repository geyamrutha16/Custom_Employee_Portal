import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('employee_portal'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  COOKIE_NAME: z.string().default('portal_token'),

  ZOHO_DEMO_MODE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  ZOHO_CLIENT_ID: z.string().default(''),
  ZOHO_CLIENT_SECRET: z.string().default(''),
  ZOHO_REFRESH_TOKEN: z.string().default(''),
  ZOHO_REDIRECT_URI: z.string().default(''),
  ZOHO_ACCOUNTS_URL: z.string().default('https://accounts.zoho.com'),
  ZOHO_API_BASE_URL: z.string().default('https://www.zohoapis.com'), // CRM
  // Zoho Desk lives on its own dedicated API domain, not under www.zohoapis.*.
  // Match the TLD to your data center (.com/.in/.eu/...), same as the URLs above.
  ZOHO_DESK_API_BASE_URL: z.string().default('https://desk.zoho.com'),
  // Required by every Zoho Desk endpoint except /organizations. Find it under
  // Zoho Desk > Setup > Developer Space > API, or from GET {ZOHO_DESK_API_BASE_URL}/api/v1/organizations.
  ZOHO_DESK_ORG_ID: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
