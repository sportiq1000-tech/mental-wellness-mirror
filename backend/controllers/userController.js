/**
 * User Controller
 * Handles user profile and account management
 */

const authService = require('../services/authService');
const sessionModel = require('../models/Session');
const tokenService = require('../services/tokenService');
const { catchAsync } = require('../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errorTypes');

/**
 * Get user profile
 * GET /api/user/profile
 * Requires authentication
 */
const getProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const profile = await authService.getProfile(userId);

  res.json({
    success: true,
    data: {
      user: profile
    }
  });
});

/**
 * Update user profile
 * PUT /api/user/profile
 * Requires authentication
 */
const updateProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { fullName, username, email } = req.body;

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const updatedUser = await authService.updateProfile(userId, updates);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
});

/**
 * Delete user account
 * DELETE /api/user/account
 * Requires authentication
 */
const deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    throw new ValidationError('Password is required to delete account');
  }

  // Delete account
  await authService.deleteAccount(userId, password);

  // Revoke all tokens
  await tokenService.revokeAllUserTokens(userId);

  // Delete all sessions
  await sessionModel.deleteAllUserSessions(userId);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

/**
 * Get user sessions
 * GET /api/user/sessions
 * Requires authentication
 */
const getSessions = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const sessions = await sessionModel.getUserSessions(userId);

  // Format sessions for response
  const formattedSessions = sessions.map(session => ({
    id: session.id,
    deviceInfo: session.device_info,
    ipAddress: session.ip_address,
    isActive: session.is_active === 1,
    lastActive: session.last_active,
    createdAt: session.created_at
  }));

  res.json({
    success: true,
    data: {
      sessions: formattedSessions
    }
  });
});

/**
 * Delete a specific session
 * DELETE /api/user/sessions/:sessionId
 * Requires authentication
 */
const deleteSession = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const sessionId = parseInt(req.params.sessionId);

  if (isNaN(sessionId)) {
    throw new ValidationError('Invalid session ID');
  }

  await sessionModel.deleteSession(sessionId, userId);

  res.json({
    success: true,
    message: 'Session deleted successfully'
  });
});

/**
 * Get user statistics
 * GET /api/user/stats
 * Requires authentication
 */
const getStats = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const User = require('../models/User');
  const stats = await User.getUserStats(userId);
  const sessionStats = await sessionModel.getSessionStats(userId);

  res.json({
    success: true,
    data: {
      stats: {
        totalEntries: stats.total_entries,
        totalSessions: sessionStats.total_sessions,
        activeSessions: sessionStats.active_sessions,
        averageSentiment: stats.avg_sentiment,
        lastActivity: sessionStats.last_activity
      }
    }
  });
});

/**
 * Get user preferences
 * GET /api/user/preferences
 * Requires authentication
 */
const getPreferences = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { getDatabase } = require('../models/database');
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT key, value
      FROM user_preferences
      WHERE user_id = ?
    `;

    db.all(sql, [userId], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const preferences = {};
      rows.forEach(row => {
        preferences[row.key] = row.value;
      });

      res.json({
        success: true,
        data: {
          preferences
        }
      });
      resolve();
    });
  });
});

/**
 * Update user preferences
 * PUT /api/user/preferences
 * Requires authentication
 */
const updatePreferences = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const preferences = req.body;

  if (!preferences || typeof preferences !== 'object') {
    throw new ValidationError('Invalid preferences format');
  }

  const { runQuery } = require('../models/database');

  // Update each preference
  for (const [key, value] of Object.entries(preferences)) {
    const sql = `
      INSERT INTO user_preferences (user_id, key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `;

    await runQuery(sql, [userId, key, String(value)]);
  }

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences
    }
  });
});

/**
 * Get user's active tokens
 * GET /api/user/tokens
 * Requires authentication
 */
const getTokens = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const tokens = await tokenService.getUserTokens(userId);

  // Format tokens (hide actual token value)
  const formattedTokens = tokens.map(token => ({
    id: token.id,
    createdAt: token.created_at,
    expiresAt: token.expires_at,
    isExpired: new Date(token.expires_at) < new Date()
  }));

  res.json({
    success: true,
    data: {
      tokens: formattedTokens
    }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  deleteAccount,
  getSessions,
  deleteSession,
  getStats,
  getPreferences,
  updatePreferences,
  getTokens
};