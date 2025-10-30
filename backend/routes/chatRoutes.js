/**
 * Chat Routes - API endpoints for reflections
 */

const express = require('express');
const router = express.Router();
const { handleChatMessage } = require('../controllers/chatController');

// POST /api/chat - Submit reflection and get AI response
router.post('/', handleChatMessage);

module.exports = router;