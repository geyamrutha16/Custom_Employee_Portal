import { env } from '../../config/env.js';

// In-memory access token cache, refreshed on demand. Never exposed outside the backend process.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const EXPIRY_BUFFER_MS = 60 * 1000;

/**
 * Real-mode Zoho OAuth: exchanges the long-lived refresh token for a short-lived
 * access token. This follows Zoho's documented refresh-token flow, but has not
 * been exercised against a live Zoho account (no credentials available in this
 * environment) — verify against current Zoho API docs before relying on it.
 */
export async function getZohoAccessToken() {
  if (env.ZOHO_DEMO_MODE) {
    throw new Error('getZohoAccessToken() should not be called while ZOHO_DEMO_MODE is enabled');
  }

  if (cachedToken && Date.now() < cachedTokenExpiresAt - EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  const response = await fetch(`${env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      refresh_token: env.ZOHO_REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoho token refresh failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Zoho token refresh response did not include an access_token');
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken;
}
