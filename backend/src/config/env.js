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

  // First click on a Zoho service sends the employee through Zoho's own OAuth
  // login/consent screen (skipped automatically by Zoho on later clicks if their
  // session/consent is still valid); we store their personal encrypted
  // refresh_token, then send them into the real Zoho web app. No employee ever
  // hands us a password. See src/controllers/zohoOAuth.controller.js.
  ZOHO_CLIENT_ID: z.string().default(''),
  ZOHO_CLIENT_SECRET: z.string().default(''),
  ZOHO_ACCOUNTS_URL: z.string().default('https://accounts.zoho.com'),

  // After the first authorization, the backend mints fresh access_tokens from the
  // stored refresh_token automatically to call these APIs directly — separate from
  // (and in addition to) the browser-navigation redirect above.
  ZOHO_API_BASE_URL: z.string().default('https://www.zohoapis.com'),
  ZOHO_DESK_API_BASE_URL: z.string().default('https://desk.zoho.com'),
  ZOHO_DESK_ORG_ID: z.string().default(''),

  // redirect_uri must match exactly what's registered for this Client ID in the
  // Zoho API Console.
  ZOHO_REDIRECT_URI: z.string().default('http://localhost:4000/api/zoho/oauth/callback'),

  // Where the employee's browser lands after granting consent — the real Zoho web
  // app. That consent step just had them log into Zoho for real on Zoho's own
  // domain, which leaves a genuine Zoho session in that browser; sending them here
  // lets them use it instead of throwing it away.
  ZOHO_CRM_PORTAL_URL: z.string().default('https://crm.zoho.com/crm/'),
  ZOHO_DESK_PORTAL_URL: z.string().default('https://desk.zoho.com/'),

  // Refresh tokens are stored encrypted in the zoho_tokens table, not here — this
  // key just protects them at rest. Must decode to exactly 32 bytes:
  // openssl rand -base64 32
  TOKEN_ENCRYPTION_KEY: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
