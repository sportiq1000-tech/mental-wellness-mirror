/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

const { AppError } = require('../utils/errorTypes');

/**
 * Development error response (detailed)
 */
function sendErrorDev(err, req, res) {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      details: err.details || null,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Production error response (sanitized)
 */
function sendErrorProd(err, req, res) {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Programming or unknown error: don't leak error details
  console.error('💥 ERROR:', err);
  
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on the server'
    }
  });
}

/**
 * Handle SQLite errors
 */
function handleSQLiteError(err) {
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE')) {
      return new AppError('Duplicate entry. This value already exists.', 409, 'DUPLICATE_ENTRY');
    }
    if (err.message.includes('FOREIGN KEY')) {
      return new AppError('Related record not found', 400, 'FOREIGN_KEY_ERROR');
    }
  }

  if (err.code === 'SQLITE_ERROR') {
    return new AppError('Database operation failed', 500, 'DATABASE_ERROR', err.message);
  }

  return err;
}

/**
 * Handle JWT errors
 */
function handleJWTError(err) {
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return new AppError('Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  return err;
}

/**
 * Handle validation errors from express-validator
 */
function handleValidationError(err) {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError('Invalid input data', 400, 'VALIDATION_ERROR', errors);
  }

  return err;
}

/**
 * Main error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Log error
  console.error('🔥 Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  let error = err;

  if (err.errno || err.code?.startsWith('SQLITE_')) {
    error = handleSQLiteError(err);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  }

  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  // Send error response
  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
}

/**
 * Handle 404 - Route not found
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Cannot ${req.method} ${req.path}`,
    404,
    'NOT_FOUND',
    'The requested resource was not found on this server'
  );
  next(error);
}

/**
 * Async error wrapper
 * Catches errors from async route handlers
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Log requests (for debugging)
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'anonymous',
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Color code by status
    if (res.statusCode >= 500) {
      console.error('❌', logData);
    } else if (res.statusCode >= 400) {
      console.warn('⚠️', logData);
    } else {
      console.log('✅', logData);
    }
  });

  next();
}

/**
 * CORS error handler
 */
function handleCORSError(err, req, res, next) {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Cross-Origin Request Blocked',
        details: 'This origin is not allowed to access this resource'
      }
    });
  }
  next(err);
}

module.exports = {
  errorHandler,
  notFoundHandler,
  catchAsync,
  requestLogger,
  handleCORSError,
  sendErrorDev,
  sendErrorProd
};