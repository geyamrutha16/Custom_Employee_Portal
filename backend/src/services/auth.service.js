import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';

export function signAuthToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

const EXPIRES_IN_UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

function expiresInToMs(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 2 * EXPIRES_IN_UNIT_MS.h; // fallback: 2h
  const [, amount, unit] = match;
  return Number(amount) * EXPIRES_IN_UNIT_MS[unit];
}

export function setAuthCookie(res, token) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: expiresInToMs(env.JWT_EXPIRES_IN),
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  });
}
