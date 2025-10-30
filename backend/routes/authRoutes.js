/**
 * Authentication Routes
 * Endpoints for registration, login, logout, token management
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middleware
const { authenticateJWT } = require('../middleware/auth');
const {
  validateRegistrationRequest,
  validateLoginRequest,
  validateRefreshTokenRequest,
  validatePasswordUpdateRequest,
  sanitizeBody
} = require('../middleware/validation');
const {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimiter');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  registrationLimiter,
  sanitizeBody(['email', 'password', 'fullName', 'username']),
  validateRegistrationRequest,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  sanitizeBody(['email', 'password']),
  validateLoginRequest,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  sanitizeBody(['refreshToken']),
  validateRefreshTokenRequest,
  authController.refresh
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  sanitizeBody(['email']),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  sanitizeBody(['token', 'newPassword']),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  sanitizeBody(['token']),
  authController.verifyEmail
);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get(
  '/me',
  authenticateJWT,
  authController.getCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Private
 */
router.post(
  '/logout',
  authenticateJWT,
  sanitizeBody(['refreshToken']),
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post(
  '/logout-all',
  authenticateJWT,
  authController.logoutAll
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateJWT,
  sanitizeBody(['currentPassword', 'newPassword']),
  validatePasswordUpdateRequest,
  authController.changePassword
);

module.exports = router;