/**
 * Chat Controller - Handles reflection submission and AI response
 */

const { generateAIResponse, getFallbackResponse } = require('../services/groqService');
const { analyzeSentimentSafe } = require('../services/sentimentService');
const { insertEntry, getRecentEntries, getMoodStatistics } = require('../services/databaseService');

/**
 * Handle chat/reflection submission
 */
async function handleChatMessage(req, res) {
  try {
    const { text, includeContext } = req.body;
    
    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Text is required',
          details: 'Please provide a valid text message'
        }
      });
    }
    
    const trimmedText = text.trim();
    
    if (trimmedText.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEXT_TOO_SHORT',
          message: 'Text is too short',
          details: 'Please write at least 10 characters'
        }
      });
    }
    
    if (trimmedText.length > 5000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEXT_TOO_LONG',
          message: 'Text is too long',
          details: 'Please limit your reflection to 5000 characters'
        }
      });
    }
    
    // Get recent entries for context (optional)
    let recentEntries = [];
    if (includeContext) {
      try {
        recentEntries = await getRecentEntries(5);
      } catch (error) {
        console.warn('Failed to fetch recent entries:', error);
      }
    }
    
    // Parallel processing: AI response + Sentiment analysis
    const [aiResponse, sentiment] = await Promise.all([
      generateAIResponse(trimmedText, recentEntries).catch(err => {
        console.error('Groq API failed:', err);
        return getFallbackResponse();
      }),
      analyzeSentimentSafe(trimmedText)
    ]);
    
    // Save to database
    const timestamp = new Date().toISOString();
    const entryData = {
      timestamp,
      userText: trimmedText,
      aiResponse,
      sentimentLabel: sentiment.label,
      sentimentScore: sentiment.compound,
      sentimentDetails: JSON.stringify(sentiment)
    };
    
    const insertResult = await insertEntry(entryData);
    
    // Get updated statistics
    const stats = await getMoodStatistics(30);
    
    // Calculate mood streak (simplified)
    const moodStreak = recentEntries.length > 0 ? recentEntries.length : 1;
    
    // Return response
    res.json({
      success: true,
      data: {
        aiResponse,
        sentiment: {
          label: sentiment.label,
          score: sentiment.compound,
          emoji: sentiment.emoji,
          details: {
            positive: sentiment.positive,
            neutral: sentiment.neutral,
            negative: sentiment.negative
          }
        },
        entryId: insertResult.id,
        timestamp,
        stats: {
          totalEntries: stats.total_entries || 0,
          moodStreak,
          weekAverage: stats.avg_score || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process your reflection',
        details: error.message
      }
    });
  }
}

module.exports = {
  handleChatMessage
};