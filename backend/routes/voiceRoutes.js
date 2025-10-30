/**
 * Voice Routes
 * UPDATED: Protected with authentication + TTS support
 */

const express = require('express');
const router = express.Router();

const {
  handleVoiceGeneration,
  processVoice,
  textToSpeech
} = require('../controllers/voiceController');

// Middleware
const { authenticateJWT } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { sanitizeBody } = require('../middleware/validation');

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================

router.use(authenticateJWT);

/**
 * @route   POST /api/voice/generate
 * @desc    Generate voice from text (TTS)
 * @access  Private
 */
router.post(
  '/generate',
  uploadLimiter,
  sanitizeBody(['text', 'language', 'slow', 'gender']),
  handleVoiceGeneration
);

/**
 * @route   POST /api/voice/tts
 * @desc    Convert text to speech (alias)
 * @access  Private
 */
router.post(
  '/tts',
  uploadLimiter,
  sanitizeBody(['text', 'language', 'slow', 'gender']),
  textToSpeech
);

/**
 * @route   POST /api/voice/process
 * @desc    Process voice input (STT - coming soon)
 * @access  Private
 */
router.post('/process', uploadLimiter, processVoice);

module.exports = router;