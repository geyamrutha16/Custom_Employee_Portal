import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { buildAuthorizationUrl, exchangeCodeForRefreshToken } from '../services/zoho/zohoOAuth.service.js';
import { setUserRefreshToken } from '../services/zoho/zohoTokenStore.service.js';
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
  cleanupExpiredStates();

  const state = crypto.randomBytes(24).toString('base64url');
  pendingStates.set(state, { userId: req.user.id, appName, expiresAt: Date.now() + STATE_TTL_MS });

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
