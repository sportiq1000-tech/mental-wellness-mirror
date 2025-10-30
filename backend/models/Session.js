/**
 * Session Model
 * Track user sessions and devices
 */

const { runQuery, getOne, getAll } = require('./database');
const { DatabaseError } = require('../utils/errorTypes');

/**
 * Create a new session
 * @param {Object} sessionData
 * @returns {Promise<Object>}
 */
async function createSession(sessionData) {
  const { userId, deviceInfo, ipAddress, userAgent } = sessionData;

  try {
    const sql = `
      INSERT INTO sessions (user_id, device_info, ip_address, user_agent, last_active, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const result = await runQuery(sql, [
      userId,
      deviceInfo || null,
      ipAddress || null,
      userAgent || null
    ]);

    return {
      id: result.id,
      userId,
      deviceInfo,
      ipAddress,
      userAgent
    };

  } catch (error) {
    throw new DatabaseError('Failed to create session', error.message);
  }
}

/**
 * Find session by ID
 * @param {number} sessionId
 * @returns {Promise<Object|null>}
 */
async function findSessionById(sessionId) {
  try {
    const sql = `
      SELECT 
        id,
        user_id,
        device_info,
        ip_address,
        user_agent,
        last_active,
        created_at
      FROM sessions
      WHERE id = ?
    `;

    const session = await getOne(sql, [sessionId]);
    return session || null;

  } catch (error) {
    throw new DatabaseError('Failed to find session', error.message);
  }
}

/**
 * Get all sessions for a user
 * @param {number} userId
 * @returns {Promise<Array>}
 */
async function getUserSessions(userId) {
  try {
    const sql = `
      SELECT 
        id,
        device_info,
        ip_address,
        user_agent,
        last_active,
        created_at,
        CASE 
          WHEN last_active > datetime('now', '-15 minutes') THEN 1
          ELSE 0
        END as is_active
      FROM sessions
      WHERE user_id = ?
      ORDER BY last_active DESC
    `;

    return await getAll(sql, [userId]);

  } catch (error) {
    throw new DatabaseError('Failed to get user sessions', error.message);
  }
}

/**
 * Update session last active timestamp
 * @param {number} sessionId
 * @returns {Promise<void>}
 */
async function updateSessionActivity(sessionId) {
  try {
    const sql = `
      UPDATE sessions
      SET last_active = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(sql, [sessionId]);

  } catch (error) {
    // Non-critical, just log
    console.warn('Failed to update session activity:', error.message);
  }
}

/**
 * Delete a specific session
 * @param {number} sessionId
 * @param {number} userId - For authorization check
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId, userId) {
  try {
    const sql = `
      DELETE FROM sessions
      WHERE id = ? AND user_id = ?
    `;

    const result = await runQuery(sql, [sessionId, userId]);

    if (result.changes === 0) {
      throw new Error('Session not found or unauthorized');
    }

  } catch (error) {
    throw new DatabaseError('Failed to delete session', error.message);
  }
}

/**
 * Delete all sessions for a user
 * @param {number} userId
 * @returns {Promise<number>} - Number of deleted sessions
 */
async function deleteAllUserSessions(userId) {
  try {
    const sql = `
      DELETE FROM sessions
      WHERE user_id = ?
    `;

    const result = await runQuery(sql, [userId]);
    return result.changes;

  } catch (error) {
    throw new DatabaseError('Failed to delete user sessions', error.message);
  }
}

/**
 * Clean up old sessions (older than 30 days)
 * @returns {Promise<number>} - Number of deleted sessions
 */
async function cleanupOldSessions() {
  try {
    const sql = `
      DELETE FROM sessions
      WHERE last_active < datetime('now', '-30 days')
    `;

    const result = await runQuery(sql);
    return result.changes;

  } catch (error) {
    console.warn('Failed to cleanup old sessions:', error.message);
    return 0;
  }
}

/**
 * Get session statistics for a user
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function getSessionStats(userId) {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN last_active > datetime('now', '-15 minutes') THEN 1 END) as active_sessions,
        MAX(last_active) as last_activity
      FROM sessions
      WHERE user_id = ?
    `;

    const stats = await getOne(sql, [userId]);
    return stats || { total_sessions: 0, active_sessions: 0, last_activity: null };

  } catch (error) {
    throw new DatabaseError('Failed to get session stats', error.message);
  }
}

/**
 * Find or create session for user
 * @param {Object} sessionData
 * @returns {Promise<Object>}
 */
async function findOrCreateSession(sessionData) {
  const { userId, deviceInfo, ipAddress, userAgent } = sessionData;

  try {
    // Try to find existing recent session with same device info
    const sql = `
      SELECT id, user_id, device_info, ip_address, user_agent, last_active, created_at
      FROM sessions
      WHERE user_id = ? 
        AND device_info = ? 
        AND last_active > datetime('now', '-1 day')
      ORDER BY last_active DESC
      LIMIT 1
    `;

    let session = await getOne(sql, [userId, deviceInfo]);

    if (session) {
      // Update existing session
      await updateSessionActivity(session.id);
      return session;
    } else {
      // Create new session
      return await createSession(sessionData);
    }

  } catch (error) {
    throw new DatabaseError('Failed to find or create session', error.message);
  }
}

/**
 * Parse device info from user agent
 * @param {string} userAgent
 * @returns {string}
 */
function parseDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown Device';

  // Simple device detection
  if (/mobile/i.test(userAgent)) {
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Mobile';
    return 'Mobile Device';
  }

  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/Linux/i.test(userAgent)) return 'Linux PC';

  return 'Desktop';
}

module.exports = {
  createSession,
  findSessionById,
  getUserSessions,
  updateSessionActivity,
  deleteSession,
  deleteAllUserSessions,
  cleanupOldSessions,
  getSessionStats,
  findOrCreateSession,
  parseDeviceInfo
};