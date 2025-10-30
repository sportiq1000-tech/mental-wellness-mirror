/**
 * Chat Routes - API endpoints for chat/reflections
 * UPDATED: User-specific with authentication
 */

const express = require('express');
const router = express.Router();
const {
  handleChatMessage,
  getChatHistory,
  getChatEntry,
  deleteChatEntry
} = require('../controllers/chatController');

// Middleware
const { authenticateJWT } = require('../middleware/auth');
const { validateChatRequest, validateIdParam } = require('../middleware/validation');
const { chatLimiter } = require('../middleware/rateLimiter');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authenticateJWT);

/**
 * @route   POST /api/chat
 * @desc    Submit chat message and get AI response
 * @access  Private
 */
router.post('/', chatLimiter, validateChatRequest, handleChatMessage);

/**
 * @route   GET /api/chat/history
 * @desc    Get user's chat history
 * @access  Private
 */
router.get('/history', getChatHistory);

/**
 * @route   GET /api/chat/:entryId
 * @desc    Get specific chat entry
 * @access  Private
 */
router.get('/:entryId', validateIdParam('entryId'), getChatEntry);

/**
 * @route   DELETE /api/chat/:entryId
 * @desc    Delete chat entry
 * @access  Private
 */
router.delete('/:entryId', validateIdParam('entryId'), deleteChatEntry);

module.exports = router;