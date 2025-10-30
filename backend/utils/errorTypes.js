/**
 * Custom Error Classes
 * For consistent error handling across the application
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * Rate Limit Error (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Database Error (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * External Service Error (502)
 */
class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', details = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

/**
 * Token Error (401)
 */
class TokenError extends AppError {
  constructor(message = 'Invalid or expired token', details = null) {
    super(message, 401, 'TOKEN_ERROR', details);
  }
}

/**
 * Account Locked Error (403)
 */
class AccountLockedError extends AppError {
  constructor(message = 'Account is locked', details = null) {
    super(message, 403, 'ACCOUNT_LOCKED', details);
  }
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  TokenError,
  AccountLockedError
};