/**
 * Voice Controller - Text-to-Speech
 * UPDATED: User-specific voice processing with authentication
 */

const { generateVoice, getAudioPath } = require('../services/ttsService');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errorTypes');
const path = require('path');

/**
 * Generate voice output from text
 * POST /api/voice/generate
 * Requires authentication
 */
const handleVoiceGeneration = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { text, language = 'en', slow = false, gender = 'female' } = req.body;
  
  // Validation
  if (!text || typeof text !== 'string') {
    throw new ValidationError('Text is required', ['Please provide valid text for voice generation']);
  }
  
  if (text.length > 1000) {
    throw new ValidationError('Text is too long for voice generation', ['Maximum 1000 characters allowed']);
  }
  
  // Validate gender parameter
  const validGenders = ['male', 'female'];
  const validGender = validGenders.includes(gender) ? gender : 'female';
  
  // Validate language
  const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
  const validLanguage = validLanguages.includes(language) ? language : 'en';
  
  // Generate voice with gender preference
  const audioFilename = await generateVoice(text, validLanguage, slow, validGender);
  
  if (!audioFilename) {
    throw new Error('Failed to generate audio file');
  }
  
  // Log voice generation for user (optional analytics)
  console.log(`🎤 Voice generated for user ${userId}: ${text.substring(0, 50)}... (${validGender} voice)`);
  
  // Return audio URL
  const audioUrl = `/api/audio/${audioFilename}`;
  
  res.json({
    success: true,
    data: {
      audioUrl,
      duration: Math.ceil(text.length / 15), // Approximate seconds
      expiresIn: 600, // 10 minutes
      gender: validGender,
      language: validLanguage
    }
  });
});

/**
 * Process voice input (placeholder for future STT)
 * POST /api/voice/process
 * Requires authentication
 */
const processVoice = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { audioData } = req.body;

  if (!audioData) {
    throw new ValidationError('Audio data is required');
  }

  // TODO: Implement actual speech-to-text processing
  // For now, return placeholder response
  res.json({
    success: true,
    message: 'Speech-to-text feature coming soon',
    data: {
      userId,
      status: 'placeholder'
    }
  });
});

/**
 * Text-to-speech (alias for handleVoiceGeneration)
 * POST /api/voice/tts
 * Requires authentication
 */
const textToSpeech = handleVoiceGeneration;

module.exports = {
  handleVoiceGeneration,
  processVoice,
  textToSpeech
};