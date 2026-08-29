import { env } from '../config/env.js';
import { verifyAuthToken } from '../services/auth.service.js';
import { getAuthContextForUser } from '../models/user.model.js';
import { ApiError } from './errorHandler.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];
    if (!token) throw new ApiError(401, 'Not authenticated');

    let payload;
    try {
      payload = verifyAuthToken(token);
    } catch {
      throw new ApiError(401, 'Session expired or invalid, please log in again');
    }

    const user = await getAuthContextForUser(payload.sub);
    if (!user) throw new ApiError(401, 'Account is no longer active');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
