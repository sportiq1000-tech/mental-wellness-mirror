/**
 * User Routes
 * Endpoints for user profile and account management
 */

const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../controllers/userController');

// Middleware
const { authenticateJWT } = require('../middleware/auth');
const {
  validateProfileUpdateRequest,
  validateIdParam,
  sanitizeBody
} = require('../middleware/validation');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authenticateJWT);

// ============================================
// PROFILE ROUTES
// ============================================

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  sanitizeBody(['fullName', 'username', 'email']),
  validateProfileUpdateRequest,
  userController.updateProfile
);

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete(
  '/account',
  sanitizeBody(['password']),
  userController.deleteAccount
);

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', userController.getStats);

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * @route   GET /api/user/sessions
 * @desc    Get all user sessions
 * @access  Private
 */
router.get('/sessions', userController.getSessions);

/**
 * @route   DELETE /api/user/sessions/:sessionId
 * @desc    Delete a specific session
 * @access  Private
 */
router.delete(
  '/sessions/:sessionId',
  validateIdParam('sessionId'),
  userController.deleteSession
);

// ============================================
// PREFERENCES
// ============================================

/**
 * @route   GET /api/user/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', userController.getPreferences);

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', userController.updatePreferences);

// ============================================
// TOKENS
// ============================================

/**
 * @route   GET /api/user/tokens
 * @desc    Get user's active tokens
 * @access  Private
 */
router.get('/tokens', userController.getTokens);

module.exports = router;