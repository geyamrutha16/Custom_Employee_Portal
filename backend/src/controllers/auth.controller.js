import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { findUserByEmail, getAuthContextForUser } from '../models/user.model.js';
import { signAuthToken, setAuthCookie, clearAuthCookie, verifyAuthToken } from '../services/auth.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!user || !passwordMatches || user.status !== 'ACTIVE') {
    await writeAuditLog({
      userId: user?.id ?? null,
      action: 'LOGIN_FAILURE',
      resource: 'auth',
      metadata: { email },
      req,
    });
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAuthToken(user.id);
  setAuthCookie(res, token);

  await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', resource: 'auth', req });

  const authContext = await getAuthContextForUser(user.id);
  res.json({ user: authContext });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  clearAuthCookie(res);

  if (token) {
    try {
      const payload = verifyAuthToken(token);
      await writeAuditLog({ userId: payload.sub, action: 'LOGOUT', resource: 'auth', req });
    } catch {
      // Token was already invalid/expired; nothing to log against, still clear the cookie.
    }
  }

  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
