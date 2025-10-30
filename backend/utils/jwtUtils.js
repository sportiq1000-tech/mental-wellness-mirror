/**
 * JWT Utilities
 * Token generation, verification, and management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secrets (from environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production-super-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-key';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days

/**
 * Generate Access Token (JWT)
 * @param {Object} payload - User data to include in token
 * @param {number} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {string} - JWT access token
 */
function generateAccessToken(payload) {
  const { userId, email, role = 'user' } = payload;

  return jwt.sign(
    {
      userId,
      email,
      role,
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'mental-wellness-mirror',
      audience: 'mental-wellness-api'
    }
  );
}

/**
 * Generate Refresh Token
 * @param {Object} payload - User data
 * @returns {Object} - { token: string, expiresAt: Date }
 */
function generateRefreshToken(payload) {
  const { userId } = payload;

  // Generate a random refresh token
  const randomToken = crypto.randomBytes(64).toString('hex');

  // Sign it with JWT for additional security
  const token = jwt.sign(
    {
      userId,
      randomToken,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'mental-wellness-mirror'
    }
  );

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Verify Access Token
 * @param {string} token - JWT to verify
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mental-wellness-mirror',
      audience: 'mental-wellness-api'
    });

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else {
      throw error;
    }
  }
}

/**
 * Verify Refresh Token
 * @param {string} token - Refresh token to verify
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mental-wellness-mirror'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token
 * @returns {Object|null}
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token
 * @returns {boolean}
 */
function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - "Bearer <token>"
 * @returns {string|null} - Token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  extractTokenFromHeader,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};