/**
 * Mood Controller
 * UPDATED: User-specific mood tracking
 */

const { runQuery, getAll, getOne } = require('../models/database');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errorTypes');

/**
 * Log a mood entry
 * POST /api/moods
 * Requires authentication
 */
const logMood = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { mood, note, intensity } = req.body;

  // Validation
  if (!mood || typeof mood !== 'string') {
    throw new ValidationError('Mood is required');
  }

  const validMoods = ['positive', 'neutral', 'negative', 'happy', 'sad', 'anxious', 'calm', 'stressed'];
  if (!validMoods.includes(mood.toLowerCase())) {
    throw new ValidationError(`Mood must be one of: ${validMoods.join(', ')}`);
  }

  const moodIntensity = intensity ? parseInt(intensity) : 3;
  if (isNaN(moodIntensity) || moodIntensity < 1 || moodIntensity > 5) {
    throw new ValidationError('Intensity must be between 1 and 5');
  }

  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  // Insert mood entry
  const entrySql = `
    INSERT INTO entries (
      user_id,
      timestamp,
      user_text,
      ai_response,
      sentiment_label,
      sentiment_score,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const moodText = note || `Feeling ${mood}`;
  const moodScore = moodIntensity / 5; // Normalize to 0-1

  const result = await runQuery(entrySql, [
    userId,
    timestamp,
    moodText,
    `Noted. You're feeling ${mood}.`,
    mood,
    moodScore
  ]);

  // Update daily statistics
  await updateMoodStatistics(userId, date);

  res.json({
    success: true,
    message: 'Mood logged successfully',
    data: {
      entryId: result.id,
      mood,
      intensity: moodIntensity,
      timestamp
    }
  });
});

/**
 * Get mood history
 * GET /api/moods/history
 * Requires authentication
 */
const getMoodHistory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const parsedDays = parseInt(days);
  if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
    throw new ValidationError('Days must be between 1 and 365');
  }

  const sql = `
    SELECT
      id,
      timestamp,
      sentiment_label as mood,
      sentiment_score as score,
      user_text as note
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-${parsedDays} days')
    ORDER BY timestamp DESC
  `;

  const moods = await getAll(sql, [userId]);

  res.json({
    success: true,
    data: {
      moods,
      period: `${parsedDays} days`
    }
  });
});

/**
 * Get mood statistics
 * GET /api/moods/stats
 * Requires authentication
 */
const getMoodStats = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const parsedDays = parseInt(days);
  if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
    throw new ValidationError('Days must be between 1 and 365');
  }

  // Overall statistics
  const overallSql = `
    SELECT
      COUNT(*) as total_entries,
      AVG(sentiment_score) as avg_score,
      MAX(sentiment_score) as max_score,
      MIN(sentiment_score) as min_score
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-${parsedDays} days')
  `;

  const overall = await getOne(overallSql, [userId]);

  // Mood distribution
  const distributionSql = `
    SELECT
      sentiment_label as mood,
      COUNT(*) as count,
      AVG(sentiment_score) as avg_score
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-${parsedDays} days')
    GROUP BY sentiment_label
    ORDER BY count DESC
  `;

  const distribution = await getAll(distributionSql, [userId]);

  // Daily statistics
  const dailySql = `
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as entry_count,
      AVG(sentiment_score) as avg_score
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-${parsedDays} days')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `;

  const daily = await getAll(dailySql, [userId]);

  res.json({
    success: true,
    data: {
      overall: {
        totalEntries: overall.total_entries || 0,
        averageScore: overall.avg_score || 0,
        maxScore: overall.max_score || 0,
        minScore: overall.min_score || 0
      },
      distribution,
      daily,
      period: `${parsedDays} days`
    }
  });
});

/**
 * Get mood trends
 * GET /api/moods/trends
 * Requires authentication
 */
const getMoodTrends = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const parsedDays = parseInt(days);

  const sql = `
    SELECT
      DATE(timestamp) as date,
      AVG(sentiment_score) as avg_score,
      COUNT(*) as count,
      GROUP_CONCAT(sentiment_label) as moods
    FROM entries
    WHERE user_id = ?
      AND timestamp > datetime('now', '-${parsedDays} days')
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
  `;

  const trends = await getAll(sql, [userId]);

  // Calculate trend direction
  let trendDirection = 'stable';
  if (trends.length >= 7) {
    const recentWeek = trends.slice(-7);
    const previousWeek = trends.slice(-14, -7);
    
    if (recentWeek.length > 0 && previousWeek.length > 0) {
      const recentAvg = recentWeek.reduce((sum, t) => sum + t.avg_score, 0) / recentWeek.length;
      const previousAvg = previousWeek.reduce((sum, t) => sum + t.avg_score, 0) / previousWeek.length;
      
      if (recentAvg > previousAvg * 1.1) trendDirection = 'improving';
      else if (recentAvg < previousAvg * 0.9) trendDirection = 'declining';
    }
  }

  res.json({
    success: true,
    data: {
      trends,
      trendDirection,
      period: `${parsedDays} days`
    }
  });
});

/**
 * Update mood statistics helper function
 */
async function updateMoodStatistics(userId, date) {
  try {
    const sql = `
      INSERT INTO mood_statistics (user_id, date, entry_count, avg_sentiment, positive_count, neutral_count, negative_count)
      SELECT
        user_id,
        DATE(timestamp) as date,
        COUNT(*) as entry_count,
        AVG(sentiment_score) as avg_sentiment,
        SUM(CASE WHEN sentiment_label IN ('positive', 'happy', 'calm') THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN sentiment_label IN ('negative', 'sad', 'anxious', 'stressed') THEN 1 ELSE 0 END) as negative_count
      FROM entries
      WHERE user_id = ? AND DATE(timestamp) = ?
      GROUP BY user_id, DATE(timestamp)
      ON CONFLICT(user_id, date) DO UPDATE SET
        entry_count = excluded.entry_count,
        avg_sentiment = excluded.avg_sentiment,
        positive_count = excluded.positive_count,
        neutral_count = excluded.neutral_count,
        negative_count = excluded.negative_count
    `;

    await runQuery(sql, [userId, date]);
  } catch (error) {
    console.warn('Failed to update mood statistics:', error);
  }
}

module.exports = {
  logMood,
  getMoodHistory,
  getMoodStats,
  getMoodTrends
};