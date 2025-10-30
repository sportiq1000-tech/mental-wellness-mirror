/**
 * Token Service
 * Manages JWT access tokens and refresh tokens
 */

const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/jwtUtils');
const RefreshToken = require('../models/RefreshToken');
const { TokenError } = require('../utils/errorTypes');

/**
 * Generate token pair for user
 * @param {Object} user
 * @returns {Promise<Object>} - { accessToken, refreshToken }
 */
async function generateTokenPair(user) {
  try {
    // Generate access token (JWT)
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user'
    });

    // Generate refresh token
    const { token: refreshToken, expiresAt } = generateRefreshToken({
      userId: user.id
    });

    // Store refresh token in database
    await RefreshToken.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      expiresIn: '15m', // Access token expiry
      tokenType: 'Bearer'
    };

  } catch (error) {
    throw new Error('Failed to generate tokens: ' + error.message);
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken
 * @returns {Promise<Object>} - { accessToken, refreshToken }
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Verify refresh token (JWT signature)
    const decoded = verifyRefreshToken(refreshToken);

    // Verify refresh token in database
    const tokenData = await RefreshToken.verifyRefreshToken(refreshToken);

    // Get user data (to include in new access token)
    const User = require('../models/User');
    const user = await User.findUserById(tokenData.user_id);

    if (!user) {
      throw new TokenError('User not found');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user'
    });

    // Optionally rotate refresh token (more secure)
    const { token: newRefreshToken, expiresAt } = generateRefreshToken({
      userId: user.id
    });

    await RefreshToken.rotateRefreshToken(refreshToken, newRefreshToken, expiresAt);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: '15m',
      tokenType: 'Bearer'
    };

  } catch (error) {
    if (error instanceof TokenError) throw error;
    throw new TokenError('Failed to refresh token: ' + error.message);
  }
}

/**
 * Revoke refresh token (logout)
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
async function revokeToken(refreshToken) {
  try {
    await RefreshToken.revokeRefreshToken(refreshToken);
    console.log('✅ Refresh token revoked');
  } catch (error) {
    throw new Error('Failed to revoke token: ' + error.message);
  }
}

/**
 * Revoke all tokens for a user (logout from all devices)
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  try {
    await RefreshToken.revokeAllUserTokens(userId);
    console.log(`✅ All tokens revoked for user ID: ${userId}`);
  } catch (error) {
    throw new Error('Failed to revoke all tokens: ' + error.message);
  }
}

/**
 * Verify access token
 * @param {string} token
 * @returns {Object} - Decoded token payload
 */
function verifyToken(token) {
  try {
    return verifyAccessToken(token);
  } catch (error) {
    throw new TokenError(error.message);
  }
}

/**
 * Get user's active tokens
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getUserTokens(userId) {
  try {
    return await RefreshToken.getUserRefreshTokens(userId);
  } catch (error) {
    throw new Error('Failed to get user tokens: ' + error.message);
  }
}

/**
 * Cleanup expired tokens (maintenance task)
 * @returns {Promise<number>}
 */
async function cleanupExpiredTokens() {
  try {
    const count = await RefreshToken.cleanupExpiredTokens();
    if (count > 0) {
      console.log(`🧹 Cleaned up ${count} expired tokens`);
    }
    return count;
  } catch (error) {
    console.warn('Failed to cleanup tokens:', error.message);
    return 0;
  }
}

module.exports = {
  generateTokenPair,
  refreshAccessToken,
  revokeToken,
  revokeAllUserTokens,
  verifyToken,
  getUserTokens,
  cleanupExpiredTokens
};