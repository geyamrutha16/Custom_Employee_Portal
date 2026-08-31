import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { buildAuthorizationUrl, exchangeCodeForRefreshToken } from '../services/zoho/zohoOAuth.service.js';
import { setUserRefreshToken, clearUserRefreshToken } from '../services/zoho/zohoTokenStore.service.js';
import { getZohoAccessToken } from '../services/zoho/zohoAuth.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

const PORTAL_URLS = { crm: env.ZOHO_CRM_PORTAL_URL, desk: env.ZOHO_DESK_PORTAL_URL };

const STATE_TTL_MS = 10 * 60 * 1000;
// Single-process in-memory store: ties Zoho's callback back to the employee who
// initiated it (and prevents CSRF) without depending on our own cookie surviving
// the round trip through Zoho's domain. Each state is single-use.
const pendingStates = new Map();

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expiresAt < now) pendingStates.delete(state);
  }
}

export const authorizeRedirect = asyncHandler(async (req, res) => {
  const { app: appName } = req.params;
  const userId = req.user.id;

  // Already authorized? Prove it by actually minting a fresh access_token from the
  // stored refresh_token (round-trips to Zoho) rather than just checking a row
  // exists — a row can be stale if the employee revoked access on Zoho's side.
  // Only on success do we skip Zoho's authorize screen entirely.
  try {
    await getZohoAccessToken(appName, userId);
    return res.redirect(PORTAL_URLS[appName]);
  } catch (err) {
    // No token stored, or Zoho rejected it as invalid/revoked. Clear it (a no-op
    // if nothing was stored) and fall through to a fresh authorization below.
    console.error(`[zoho oauth] employee ${userId} not treated as already-authorized for ${appName}:`, err.message);
    await clearUserRefreshToken(userId, appName);
  }

  cleanupExpiredStates();

  const state = crypto.randomBytes(24).toString('base64url');
  pendingStates.set(state, { userId, appName, expiresAt: Date.now() + STATE_TTL_MS });

  res.redirect(buildAuthorizationUrl(appName, state));
});

export const oauthCallback = asyncHandler(async (req, res) => {
  const { code, state, error: zohoError } = req.query;

  if (zohoError) {
    return res.redirect(`${env.FRONTEND_ORIGIN}/dashboard?zoho_error=${encodeURIComponent(zohoError)}`);
  }

  const pending = pendingStates.get(state);
  if (!pending || pending.expiresAt < Date.now()) {
    pendingStates.delete(state);
    throw new ApiError(400, 'Invalid or expired Zoho authorization state');
  }
  pendingStates.delete(state); // single-use

  const refreshToken = await exchangeCodeForRefreshToken(code);
  await setUserRefreshToken(pending.userId, pending.appName, refreshToken);

  await writeAuditLog({
    userId: pending.userId,
    action: 'ZOHO_SERVICE_ACCESS',
    resource: `zoho_${pending.appName}`,
    req,
  });

  // Consent just had them log into Zoho for real, in this browser, on Zoho's own
  // domain — that's what leaves a genuine Zoho session behind. Send them into the
  // real app to use it.
  res.redirect(PORTAL_URLS[pending.appName]);
});
