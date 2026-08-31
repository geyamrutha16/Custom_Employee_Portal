import { env } from '../../config/env.js';
import { getUserRefreshToken } from './zohoTokenStore.service.js';

const EXPIRY_BUFFER_MS = 60 * 1000;
const tokenCache = new Map(); // `${appName}:${userId}` -> { accessToken, expiresAt }

export async function getZohoAccessToken(appName, userId) {
  const cacheKey = `${appName}:${userId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - EXPIRY_BUFFER_MS) {
    return cached.accessToken;
  }

  const refreshToken = await getUserRefreshToken(userId, appName);
  if (!refreshToken) {
    throw new Error(`Employee ${userId} has not authorized Zoho ${appName} yet`);
  }

  const response = await fetch(`${env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zoho token refresh failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Zoho token refresh response did not include an access_token');
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });

  return data.access_token;
}
