import { pool } from '../../db/pool.js';
import { encryptToken, decryptToken } from '../../utils/tokenCrypto.js';

export async function getUserRefreshToken(userId, appName) {
  const [rows] = await pool.query('SELECT encrypted_refresh_token, iv, auth_tag FROM zoho_tokens WHERE user_id = ? AND app_name = ?', [
    userId,
    appName,
  ]);
  if (rows.length === 0) return null;
  const row = rows[0];
  try {
    return decryptToken({ encrypted: row.encrypted_refresh_token, iv: row.iv, authTag: row.auth_tag });
  } catch {
    // TOKEN_ENCRYPTION_KEY rotated since this row was written — it's permanently
    // unreadable now. Treat it the same as "never connected" so the caller gets a
    // clean re-authorization prompt instead of a raw crypto crash.
    return null;
  }
}

export async function setUserRefreshToken(userId, appName, refreshToken) {
  const { encrypted, iv, authTag } = encryptToken(refreshToken);
  await pool.query(
    `INSERT INTO zoho_tokens (user_id, app_name, encrypted_refresh_token, iv, auth_tag)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE encrypted_refresh_token = VALUES(encrypted_refresh_token), iv = VALUES(iv), auth_tag = VALUES(auth_tag)`,
    [userId, appName, encrypted, iv, authTag]
  );
}

export async function clearUserRefreshToken(userId, appName) {
  await pool.query('DELETE FROM zoho_tokens WHERE user_id = ? AND app_name = ?', [userId, appName]);
}
