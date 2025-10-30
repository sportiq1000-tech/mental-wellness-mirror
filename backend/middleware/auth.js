/**
 * Authentication Middleware
 * JWT verification and user context
 */

const { extractTokenFromHeader, verifyAccessToken } = require('../utils/jwtUtils');
const { AuthenticationError, TokenError } = require('../utils/errorTypes');
const User = require('../models/User');

/**
 * Authenticate JWT token
 * Adds req.user to request if valid
 */
async function authenticateJWT(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      throw new TokenError(error.message);
    }

    // Get user from database
    const user = await User.findUserById(decoded.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Check if account is deleted
    if (user.deleted_at) {
      throw new AuthenticationError('Account has been deleted');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      role: decoded.role || 'user'
    };

    // Attach token payload
    req.token = decoded;

    next();

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof TokenError) {
      return res.status(401).json(error.toJSON());
    }

    console.error('Authentication middleware error:', error);
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}

/**
 * Optional authentication
 * Doesn't fail if no token, but adds user if valid token provided
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    // Try to verify token
    const decoded = verifyAccessToken(token);
    const user = await User.findUserById(decoded.userId);

    if (user && !user.deleted_at) {
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: decoded.role || 'user'
      };
    }

    next();

  } catch (error) {
    // Token invalid, but don't fail - just continue without user
    next();
  }
}

/**
 * Require email verification
 * Use after authenticateJWT
 */
function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required'
      }
    });
  }

  // Check if user email is verified
  User.findUserById(req.user.id)
    .then(user => {
      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Email verification required',
            details: 'Please verify your email address to access this resource'
          }
        });
      }
      next();
    })
    .catch(error => {
      console.error('Email verification check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Verification check failed'
        }
      });
    });
}

/**
 * Require specific role
 * Use after authenticateJWT
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          details: `Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    next();
  };
}

/**
 * Check if user owns resource
 * Compares req.user.id with req.params.userId or req.body.userId
 */
function requireOwnership(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        }
      });
    }

    const resourceUserId = req.params[paramName] || req.body[paramName];

    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing ${paramName} parameter`
        }
      });
    }

    // Allow if user owns resource OR is admin
    if (parseInt(resourceUserId) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Access denied',
          details: 'You can only access your own resources'
        }
      });
    }

    next();
  };
}

/**
 * Extract user info from request (for logging/tracking)
 */
function extractUserContext(req) {
  return {
    userId: req.user?.id || null,
    email: req.user?.email || null,
    ip: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  };
}

module.exports = {
  authenticateJWT,
  optionalAuth,
  requireEmailVerified,
  requireRole,
  requireOwnership,
  extractUserContext
};