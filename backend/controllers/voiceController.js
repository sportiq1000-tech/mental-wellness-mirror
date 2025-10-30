/**
 * Voice Controller - Text-to-Speech
 */

const { generateVoice, getAudioPath } = require('../services/ttsService');
const path = require('path');

/**
 * Generate voice output from text
 */
async function handleVoiceGeneration(req, res) {
    try {
        const { text, language = 'en', slow = false } = req.body;
        
        // Validation
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Text is required',
                    details: 'Please provide valid text for voice generation'
                }
            });
        }
        
        if (text.length > 1000) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TEXT_TOO_LONG',
                    message: 'Text is too long for voice generation',
                    details: 'Maximum 1000 characters allowed'
                }
            });
        }
        
        // Generate voice
        const audioFilename = await generateVoice(text, language, slow);
        
        if (!audioFilename) {
            throw new Error('Failed to generate audio file');
        }
        
        // Return audio URL
        const audioUrl = `/api/audio/${audioFilename}`;
        
        res.json({
            success: true,
            data: {
                audioUrl,
                duration: Math.ceil(text.length / 15), // Approximate seconds
                expiresIn: 600 // 10 minutes
            }
        });
        
    } catch (error) {
        console.error('Voice generation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'VOICE_GENERATION_ERROR',
                message: 'Failed to generate voice output',
                details: error.message
            }
        });
    }
}

module.exports = {
    handleVoiceGeneration
};