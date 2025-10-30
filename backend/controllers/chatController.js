/**
 * Chat Controller - Handles reflection submission and AI response
 * UPDATED: Now user-specific
 */

const { generateAIResponse, getFallbackResponse } = require('../services/groqService');
const { analyzeSentimentSafe } = require('../services/sentimentService');
const { runQuery, getAll, getOne } = require('../models/database');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errorTypes');

/**
 * Submit chat message and get AI response
 * POST /api/chat
 * Requires authentication
 */
const handleChatMessage = catchAsync(async (req, res) => {
  const { text, includeContext } = req.body;
  const userId = req.user.id; // From authentication middleware
  
  // Validation
  if (!text || typeof text !== 'string') {
    throw new ValidationError('Text is required', ['Please provide a valid text message']);
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < 10) {
    throw new ValidationError('Text is too short', ['Please write at least 10 characters']);
  }
  
  if (trimmedText.length > 5000) {
    throw new ValidationError('Text is too long', ['Please limit your reflection to 5000 characters']);
  }
  
  // Get recent entries for context (user-specific)
  let recentEntries = [];
  if (includeContext) {
    try {
      const sql = `
        SELECT user_text, ai_response, sentiment_label, timestamp
        FROM entries
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
      `;
      recentEntries = await getAll(sql, [userId]);
    } catch (error) {
      console.warn('Failed to fetch recent entries:', error);
    }
  }
  
  // Track if we used fallback
  let usedFallback = false;
  let aiResponse;
  
  // Try Groq API, use fallback if it fails
  try {
    aiResponse = await generateAIResponse(trimmedText, recentEntries);
  } catch (error) {
    console.error('Groq API failed:', error);
    aiResponse = getFallbackResponse();
    usedFallback = true;
  }
  
  // Sentiment analysis
  const sentiment = await analyzeSentimentSafe(trimmedText);
  
  // Save to database (user-specific)
  const timestamp = new Date().toISOString();
  const insertSql = `
    INSERT INTO entries (
      user_id,
      timestamp,
      user_text,
      ai_response,
      sentiment_label,
      sentiment_score,
      sentiment_details,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  
  const insertResult = await runQuery(insertSql, [
    userId,
    timestamp,
    trimmedText,
    aiResponse,
    sentiment.label,
    sentiment.compound,
    JSON.stringify(sentiment)
  ]);
  
  // Get updated statistics (user-specific)
  const statsSql = `
    SELECT
      COUNT(*) as total_entries,
      AVG(sentiment_score) as avg_score
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-30 days')
  `;
  
  const stats = await getOne(statsSql, [userId]);
  
  // Calculate mood streak (simplified)
  const streakSql = `
    SELECT COUNT(*) as streak
    FROM entries
    WHERE user_id = ?
      AND DATE(timestamp) = DATE('now')
  `;
  
  const streakResult = await getOne(streakSql, [userId]);
  const moodStreak = streakResult ? streakResult.streak : 1;
  
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
      },
      source: usedFallback ? 'fallback' : 'groq'
    }
  });
});

/**
 * Get user's chat history
 * GET /api/chat/history
 * Requires authentication
 */
const getChatHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  const sql = `
    SELECT
      id,
      timestamp,
      user_text,
      ai_response,
      sentiment_label,
      sentiment_score,
      created_at
    FROM entries
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const entries = await getAll(sql, [userId, parseInt(limit), parseInt(offset)]);

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM entries WHERE user_id = ?`;
  const countResult = await getOne(countSql, [userId]);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: countResult.total > parseInt(offset) + parseInt(limit)
      }
    }
  });
});

/**
 * Get a specific chat entry
 * GET /api/chat/:entryId
 * Requires authentication
 */
const getChatEntry = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const entryId = parseInt(req.params.entryId);

  if (isNaN(entryId)) {
    throw new ValidationError('Invalid entry ID');
  }

  const sql = `
    SELECT
      id,
      timestamp,
      user_text,
      ai_response,
      sentiment_label,
      sentiment_score,
      sentiment_details,
      voice_played,
      created_at
    FROM entries
    WHERE id = ? AND user_id = ?
  `;

  const entry = await getOne(sql, [entryId, userId]);

  if (!entry) {
    throw new ValidationError('Entry not found or access denied');
  }

  res.json({
    success: true,
    data: {
      entry
    }
  });
});

/**
 * Delete a chat entry
 * DELETE /api/chat/:entryId
 * Requires authentication
 */
const deleteChatEntry = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const entryId = parseInt(req.params.entryId);

  if (isNaN(entryId)) {
    throw new ValidationError('Invalid entry ID');
  }

  const sql = `DELETE FROM entries WHERE id = ? AND user_id = ?`;
  const result = await runQuery(sql, [entryId, userId]);

  if (result.changes === 0) {
    throw new ValidationError('Entry not found or access denied');
  }

  res.json({
    success: true,
    message: 'Entry deleted successfully'
  });
});

module.exports = {
  handleChatMessage,
  getChatHistory,
  getChatEntry,
  deleteChatEntry
};