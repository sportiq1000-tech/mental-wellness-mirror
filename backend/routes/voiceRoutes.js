/**
 * Voice Routes - TTS endpoints
 */

const express = require('express');
const router = express.Router();
const { handleVoiceGeneration } = require('../controllers/voiceController');

// POST /api/voice - Generate voice output
router.post('/', handleVoiceGeneration);

module.exports = router;