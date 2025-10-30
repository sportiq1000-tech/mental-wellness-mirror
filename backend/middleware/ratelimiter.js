/**
 * Rate Limiting Middleware
 * Protect against brute force and DDoS attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      details: 'Rate limit: 100 requests per 15 minutes'
    }
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Skip rate limiting for health check
  skip: (req) => req.path === '/api/health'
});

/**
 * Strict limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      details: 'Rate limit: 5 attempts per 15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many accounts created from this IP, please try again later',
      details: 'Rate limit: 3 registrations per hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password reset rate limiter
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests, please try again later',
      details: 'Rate limit: 3 requests per hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Chat/AI endpoint limiter
 * 30 messages per 15 minutes per user
 */
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many messages sent, please slow down',
      details: 'Rate limit: 30 messages per 15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key instead of IP (if authenticated)
  keyGenerator: (req) => {
    return req.user?.id?.toString() || req.ip;
  }
});

/**
 * File upload rate limiter
 * 10 uploads per hour
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later',
      details: 'Rate limit: 10 uploads per hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 * @returns {Function} - Rate limiter middleware
 */
function createRateLimiter(options) {
  const defaults = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    }
  };

  return rateLimit({ ...defaults, ...options });
}

/**
 * Dynamic rate limiter based on user role
 * Premium users get higher limits
 */
const dynamicLimiter = (req, res, next) => {
  const userRole = req.user?.role || 'user';
  
  // Different limits for different roles
  const limits = {
    admin: 1000,
    premium: 200,
    user: 100
  };

  const max = limits[userRole] || limits.user;

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator: (req) => req.user?.id?.toString() || req.ip,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: `Rate limit: ${max} requests per 15 minutes`
      }
    }
  });

  return limiter(req, res, next);
};

module.exports = {
  apiLimiter,
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  chatLimiter,
  uploadLimiter,
  createRateLimiter,
  dynamicLimiter
};