/**
 * RefreshToken Model
 * Database operations for refresh token management
 */

const { runQuery, getOne, getAll } = require('./database');
const { DatabaseError, TokenError } = require('../utils/errorTypes');

/**
 * Store a new refresh token
 * @param {number} userId
 * @param {string} token
 * @param {string} expiresAt - ISO date string
 * @returns {Promise<Object>}
 */
async function createRefreshToken(userId, token, expiresAt) {
  try {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const result = await runQuery(sql, [userId, token, expiresAt]);

    return {
      id: result.id,
      userId,
      token,
      expiresAt
    };

  } catch (error) {
    throw new DatabaseError('Failed to create refresh token', error.message);
  }
}

/**
 * Find refresh token
 * @param {string} token
 * @returns {Promise<Object|null>}
 */
async function findRefreshToken(token) {
  try {
    const sql = `
      SELECT 
        id,
        user_id,
        token,
        expires_at,
        revoked,
        revoked_at,
        created_at
      FROM refresh_tokens
      WHERE token = ?
    `;

    const tokenData = await getOne(sql, [token]);
    return tokenData || null;

  } catch (error) {
    throw new DatabaseError('Failed to find refresh token', error.message);
  }
}

/**
 * Verify refresh token is valid
 * @param {string} token
 * @returns {Promise<Object>} - Token data with user_id
 * @throws {TokenError}
 */
async function verifyRefreshToken(token) {
  try {
    const tokenData = await findRefreshToken(token);

    if (!tokenData) {
      throw new TokenError('Invalid refresh token');
    }

    if (tokenData.revoked) {
      throw new TokenError('Refresh token has been revoked');
    }

    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (expiresAt < now) {
      // Auto-revoke expired token
      await revokeRefreshToken(token);
      throw new TokenError('Refresh token has expired');
    }

    return tokenData;

  } catch (error) {
    if (error instanceof TokenError) throw error;
    throw new DatabaseError('Failed to verify refresh token', error.message);
  }
}

/**
 * Revoke a refresh token
 * @param {string} token
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token) {
  try {
    const sql = `
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
      WHERE token = ?
    `;

    await runQuery(sql, [token]);

  } catch (error) {
    throw new DatabaseError('Failed to revoke refresh token', error.message);
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  try {
    const sql = `
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked = 0
    `;

    await runQuery(sql, [userId]);

  } catch (error) {
    throw new DatabaseError('Failed to revoke user tokens', error.message);
  }
}

/**
 * Get all active refresh tokens for a user
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getUserRefreshTokens(userId) {
  try {
    const sql = `
      SELECT 
        id,
        token,
        expires_at,
        created_at
      FROM refresh_tokens
      WHERE user_id = ? 
        AND revoked = 0 
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `;

    return await getAll(sql, [userId]);

  } catch (error) {
    throw new DatabaseError('Failed to get user tokens', error.message);
  }
}

/**
 * Clean up expired and revoked tokens (maintenance task)
 * @returns {Promise<number>} - Number of deleted tokens
 */
async function cleanupExpiredTokens() {
  try {
    const sql = `
      DELETE FROM refresh_tokens
      WHERE expires_at < datetime('now', '-30 days')
        OR (revoked = 1 AND revoked_at < datetime('now', '-30 days'))
    `;

    const result = await runQuery(sql);
    return result.changes;

  } catch (error) {
    console.warn('Failed to cleanup expired tokens:', error.message);
    return 0;
  }
}

/**
 * Rotate refresh token (revoke old, create new)
 * @param {string} oldToken
 * @param {string} newToken
 * @param {string} expiresAt
 * @returns {Promise<Object>}
 */
async function rotateRefreshToken(oldToken, newToken, expiresAt) {
  try {
    // Verify old token and get user_id
    const oldTokenData = await verifyRefreshToken(oldToken);

    // Revoke old token
    await revokeRefreshToken(oldToken);

    // Create new token
    return await createRefreshToken(oldTokenData.user_id, newToken, expiresAt);

  } catch (error) {
    if (error instanceof TokenError) throw error;
    throw new DatabaseError('Failed to rotate refresh token', error.message);
  }
}

/**
 * Count active tokens for a user
 * @param {number} userId
 * @returns {Promise<number>}
 */
async function countActiveTokens(userId) {
  try {
    const sql = `
      SELECT COUNT(*) as count
      FROM refresh_tokens
      WHERE user_id = ? 
        AND revoked = 0 
        AND expires_at > datetime('now')
    `;

    const result = await getOne(sql, [userId]);
    return result ? result.count : 0;

  } catch (error) {
    throw new DatabaseError('Failed to count active tokens', error.message);
  }
}

module.exports = {
  createRefreshToken,
  findRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserRefreshTokens,
  cleanupExpiredTokens,
  rotateRefreshToken,
  countActiveTokens
};