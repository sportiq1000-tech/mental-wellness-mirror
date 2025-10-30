/**
 * Password Utilities
 * Hashing, validation, and strength checking
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Password requirements (STRICT)
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
};

/**
 * Common passwords to reject (top 100 most common)
 */
const COMMON_PASSWORDS = [
  'password', '12345678', 'qwerty', 'abc123', 'monkey', '1234567', 
  'letmein', 'trustno1', 'dragon', 'baseball', '111111', 'iloveyou',
  'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow',
  'superman', 'qazwsx', 'michael', 'football', '123456789', 'password1',
  'welcome', 'admin', 'princess', 'login', 'starwars', 'solo'
];

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    throw new Error('Failed to hash password: ' + error.message);
  }
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Failed to verify password: ' + error.message);
  }
}

/**
 * Validate password strength (STRICT)
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];

  // Check if password exists
  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }

  // Length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Uppercase check
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character check
  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a more secure password');
  }

  // Sequential characters check (e.g., "123456" or "abcdef")
  if (/(.)\1{2,}/.test(password) || /012|123|234|345|456|567|678|789|abc|bcd|cde|def/i.test(password)) {
    errors.push('Password should not contain sequential characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate password strength score (0-100)
 * @param {string} password
 * @returns {Object} - { score: number, level: string, feedback: string }
 */
function calculatePasswordStrength(password) {
  let score = 0;

  if (!password) {
    return { score: 0, level: 'very-weak', feedback: 'Password is required' };
  }

  // Length score (max 30 points)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety (max 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;

  // Complexity bonus (max 30 points)
  const varietyCount = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ].filter(Boolean).length;

  if (varietyCount === 4) score += 15;
  if (password.length >= 12 && varietyCount >= 3) score += 15;

  // Penalties
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) score -= 50;
  if (/(.)\1{2,}/.test(password)) score -= 10;

  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level, feedback;
  if (score < 20) {
    level = 'very-weak';
    feedback = 'Very weak password. Please use a stronger password.';
  } else if (score < 40) {
    level = 'weak';
    feedback = 'Weak password. Add more variety to strengthen it.';
  } else if (score < 60) {
    level = 'fair';
    feedback = 'Fair password. Consider adding more characters.';
  } else if (score < 80) {
    level = 'good';
    feedback = 'Good password. Well done!';
  } else {
    level = 'strong';
    feedback = 'Strong password. Excellent!';
  }

  return { score, level, feedback };
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  calculatePasswordStrength,
  PASSWORD_REQUIREMENTS
};