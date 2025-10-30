/**
 * Mood Controller - Handles mood tracking and statistics
 */

const { getMoodHistory, getMoodStatistics, getAllEntries } = require('../services/databaseService');

/**
 * Get mood history for charts
 */
async function getMoodHistoryData(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RANGE',
          message: 'Invalid date range',
          details: 'Days must be between 1 and 365'
        }
      });
    }
    
    const entries = await getMoodHistory(days);
    const stats = await getMoodStatistics(days);
    
    // Determine trend
    let trend = 'stable';
    if (entries.length >= 3) {
      const recentAvg = entries.slice(-3).reduce((sum, e) => sum + e.sentiment_score, 0) / 3;
      const olderAvg = entries.slice(0, 3).reduce((sum, e) => sum + e.sentiment_score, 0) / 3;
      
      if (recentAvg - olderAvg > 0.1) trend = 'improving';
      else if (olderAvg - recentAvg > 0.1) trend = 'declining';
    }
    
    res.json({
      success: true,
      data: {
        entries: entries.map(e => ({
          timestamp: e.timestamp,
          sentimentScore: e.sentiment_score,
          sentimentLabel: e.sentiment_label,
          snippet: e.snippet + '...'
        })),
        statistics: {
          totalEntries: stats.total_entries || 0,
          averageScore: parseFloat((stats.avg_score || 0).toFixed(3)),
          positiveCount: stats.positive_count || 0,
          neutralCount: stats.neutral_count || 0,
          negativeCount: stats.negative_count || 0,
          mostCommonEmotion: determineMostCommon(stats)
        },
        trend
      }
    });
    
  } catch (error) {
    console.error('Mood history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve mood history',
        details: error.message
      }
    });
  }
}

/**
 * Get recent mood data (for dashboard)
 */
async function getRecentMoodData(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const entries = await getMoodHistory(7);
    
    res.json({
      success: true,
      data: {
        recent: entries.slice(0, limit).map(e => ({
          timestamp: e.timestamp,
          score: e.sentiment_score,
          label: e.sentiment_label
        }))
      }
    });
    
  } catch (error) {
    console.error('Recent mood error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to retrieve recent mood data',
        details: error.message
      }
    });
  }
}

/**
 * Export all data
 */
async function exportAllData(req, res) {
  try {
    const format = req.query.format || 'json';
    const days = parseInt(req.query.days) || 365;
    
    const entries = await getAllEntries();
    const stats = await getMoodStatistics(days);
    
    // Filter entries by days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredEntries = entries.filter(e => new Date(e.timestamp) >= cutoffDate);
    
    const exportData = {
      exportMetadata: {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        totalEntries: filteredEntries.length,
        dateRange: {
          start: filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].timestamp : null,
          end: filteredEntries.length > 0 ? filteredEntries[0].timestamp : null
        }
      },
      entries: filteredEntries.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        reflection: e.user_text,
        aiResponse: e.ai_response,
        sentiment: {
          label: e.sentiment_label,
          score: e.sentiment_score
        }
      })),
      statistics: {
        averageSentiment: parseFloat((stats.avg_score || 0).toFixed(3)),
        moodDistribution: {
          positive: stats.positive_count || 0,
          neutral: stats.neutral_count || 0,
          negative: stats.negative_count || 0
        }
      }
    };
    
    if (format === 'json') {
      const filename = `wellness-journal-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(exportData);
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Unsupported export format',
          details: 'Only JSON format is supported'
        }
      });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export data',
        details: error.message
      }
    });
  }
}

/**
 * Helper: Determine most common emotion
 */
function determineMostCommon(stats) {
  const counts = {
    Positive: stats.positive_count || 0,
    Neutral: stats.neutral_count || 0,
    Negative: stats.negative_count || 0
  };
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

module.exports = {
  getMoodHistoryData,
  getRecentMoodData,
  exportAllData
};