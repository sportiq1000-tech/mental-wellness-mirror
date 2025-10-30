/**
 * Input Validation Utilities
 * Merged: Original validators + Authentication validators
 */

const { ValidationError } = require('./errorTypes');

// ============================================
// ORIGINAL VALIDATORS (Preserved)
// ============================================

/**
 * Validate text input for chat
 */
function validateChatText(text) {
  const errors = [];
  
  if (!text || typeof text !== 'string') {
    errors.push('Text must be a non-empty string');
    return { valid: false, errors };
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < 10) {
    errors.push('Text must be at least 10 characters long');
  }
  
  if (trimmedText.length > 5000) {
    errors.push('Text must not exceed 5000 characters');
  }
  
  // Check for potentially harmful content (basic XSS prevention)
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedText)) {
      errors.push('Text contains potentially unsafe content');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: trimmedText
  };
}

/**
 * Validate date range parameter
 */
function validateDaysParameter(days) {
  const parsedDays = parseInt(days);
  
  if (isNaN(parsedDays)) {
    return { valid: false, error: 'Days must be a number' };
  }
  
  if (parsedDays < 1 || parsedDays > 365) {
    return { valid: false, error: 'Days must be between 1 and 365' };
  }
  
  return { valid: true, value: parsedDays };
}

/**
 * Validate coordinates for location search
 */
function validateCoordinates(lat, lng) {
  const errors = [];
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    errors.push('Invalid latitude (must be between -90 and 90)');
  }
  
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    errors.push('Invalid longitude (must be between -180 and 180)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    coordinates: { lat: latitude, lng: longitude }
  };
}

/**
 * Sanitize text for safe output
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ============================================
// NEW AUTHENTICATION VALIDATORS
// ============================================

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate username format
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  
  // 3-30 characters, alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize string input (prevent XSS) - enhanced version
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 10000); // Limit length
}

/**
 * Validate text input length
 * @param {string} text
 * @param {number} minLength
 * @param {number} maxLength
 * @returns {boolean}
 */
function isValidLength(text, minLength = 1, maxLength = 10000) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Validate registration data
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateRegistration(data) {
  const errors = [];

  // Email validation
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  // Password validation (done separately with passwordUtils)
  if (!data.password) {
    errors.push('Password is required');
  }

  // Full name validation (optional but if provided, should be valid)
  if (data.fullName && !isValidLength(data.fullName, 1, 100)) {
    errors.push('Full name must be between 1 and 100 characters');
  }

  // Username validation (optional)
  if (data.username && !isValidUsername(data.username)) {
    errors.push('Username must be 3-30 characters (alphanumeric, underscore, hyphen only)');
  }

  if (errors.length > 0) {
    throw new ValidationError('Registration validation failed', errors);
  }

  return true;
}

/**
 * Validate login data
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateLogin(data) {
  const errors = [];

  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    throw new ValidationError('Login validation failed', errors);
  }

  return true;
}

/**
 * Validate chat message (new version compatible with chatController)
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateChatMessage(data) {
  const errors = [];

  if (!data.text || typeof data.text !== 'string') {
    errors.push('Text is required');
  } else {
    const trimmed = data.text.trim();
    
    if (trimmed.length < 10) {
      errors.push('Text must be at least 10 characters');
    }
    
    if (trimmed.length > 5000) {
      errors.push('Text must not exceed 5000 characters');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Chat message validation failed', errors);
  }

  return true;
}

/**
 * Validate mood entry
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateMoodEntry(data) {
  const errors = [];

  if (!data.mood || typeof data.mood !== 'string') {
    errors.push('Mood is required');
  }

  const validMoods = ['positive', 'neutral', 'negative', 'happy', 'sad', 'anxious', 'calm', 'stressed'];
  if (data.mood && !validMoods.includes(data.mood.toLowerCase())) {
    errors.push(`Mood must be one of: ${validMoods.join(', ')}`);
  }

  if (data.note && !isValidLength(data.note, 0, 1000)) {
    errors.push('Note must not exceed 1000 characters');
  }

  if (errors.length > 0) {
    throw new ValidationError('Mood entry validation failed', errors);
  }

  return true;
}

/**
 * Validate password update data
 * @param {Object} data
 * @throws {ValidationError}
 */
function validatePasswordUpdate(data) {
  const errors = [];

  if (!data.currentPassword) {
    errors.push('Current password is required');
  }

  if (!data.newPassword) {
    errors.push('New password is required');
  }

  if (data.currentPassword === data.newPassword) {
    errors.push('New password must be different from current password');
  }

  if (errors.length > 0) {
    throw new ValidationError('Password update validation failed', errors);
  }

  return true;
}

/**
 * Validate profile update data
 * @param {Object} data
 * @throws {ValidationError}
 */
function validateProfileUpdate(data) {
  const errors = [];

  if (data.fullName && !isValidLength(data.fullName, 1, 100)) {
    errors.push('Full name must be between 1 and 100 characters');
  }

  if (data.username && !isValidUsername(data.username)) {
    errors.push('Username must be 3-30 characters (alphanumeric, underscore, hyphen only)');
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (errors.length > 0) {
    throw new ValidationError('Profile update validation failed', errors);
  }

  return true;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Original validators (preserved)
  validateChatText,
  validateDaysParameter,
  validateCoordinates,
  sanitizeText,
  
  // New authentication validators
  isValidEmail,
  isValidUsername,
  sanitizeString,
  isValidLength,
  validateRegistration,
  validateLogin,
  validateChatMessage,
  validateMoodEntry,
  validatePasswordUpdate,
  validateProfileUpdate
};