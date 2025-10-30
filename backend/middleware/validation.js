/**
 * Validation Middleware
 * Request body and parameter validation
 */

const { ValidationError } = require('../utils/errorTypes');
const {
  validateRegistration,
  validateLogin,
  validateChatMessage,
  validatePasswordUpdate,
  validateProfileUpdate
} = require('../utils/validators');

/**
 * Validate registration request
 */
function validateRegistrationRequest(req, res, next) {
  try {
    validateRegistration(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
}

/**
 * Validate login request
 */
function validateLoginRequest(req, res, next) {
  try {
    validateLogin(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
}

/**
 * Validate chat message request
 */
function validateChatRequest(req, res, next) {
  try {
    validateChatMessage(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
}

/**
 * Validate password update request
 */
function validatePasswordUpdateRequest(req, res, next) {
  try {
    validatePasswordUpdate(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
}

/**
 * Validate profile update request
 */
function validateProfileUpdateRequest(req, res, next) {
  try {
    validateProfileUpdate(req.body);
    next();
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    });
  }
}

/**
 * Validate refresh token request
 */
function validateRefreshTokenRequest(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required'
      }
    });
  }

  next();
}

/**
 * Sanitize request body
 * Removes any unexpected fields
 */
function sanitizeBody(allowedFields) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const sanitized = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        sanitized[field] = req.body[field];
      }
    }

    req.body = sanitized;
    next();
  };
}

/**
 * Validate pagination parameters
 */
function validatePagination(req, res, next) {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid page number'
        }
      });
    }
    req.query.page = pageNum;
  } else {
    req.query.page = 1;
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Limit must be between 1 and 100'
        }
      });
    }
    req.query.limit = limitNum;
  } else {
    req.query.limit = 20;
  }

  next();
}

/**
 * Validate ID parameter
 */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    const idNum = parseInt(id);

    if (isNaN(idNum) || idNum < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid ${paramName}`
        }
      });
    }

    req.params[paramName] = idNum;
    next();
  };
}

module.exports = {
  validateRegistrationRequest,
  validateLoginRequest,
  validateChatRequest,
  validatePasswordUpdateRequest,
  validateProfileUpdateRequest,
  validateRefreshTokenRequest,
  sanitizeBody,
  validatePagination,
  validateIdParam
};