/**
 * Database Service - CRUD operations with parameterized queries
 */

const { getDatabase } = require('../models/database');

/**
 * Insert a new journal entry
 */
async function insertEntry(entryData) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const { timestamp, userText, aiResponse, sentimentLabel, sentimentScore, sentimentDetails } = entryData;
    
    const query = `
      INSERT INTO entries (
        timestamp, 
        user_text, 
        ai_response, 
        sentiment_label, 
        sentiment_score, 
        sentiment_details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      query, 
      [timestamp, userText, aiResponse, sentimentLabel, sentimentScore, sentimentDetails],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes
          });
        }
      }
    );
  });
}

/**
 * Get recent entries (for context)
 */
async function getRecentEntries(limit = 5) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT 
        id,
        timestamp,
        user_text,
        sentiment_score,
        sentiment_label
      FROM entries
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    
    db.all(query, [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Get mood history for specified days
 */
async function getMoodHistory(days = 7) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT 
        id,
        timestamp,
        sentiment_label,
        sentiment_score,
        SUBSTR(user_text, 1, 50) as snippet
      FROM entries
      WHERE timestamp >= datetime('now', '-${days} days')
      ORDER BY timestamp ASC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Get mood statistics for specified days
 */
async function getMoodStatistics(days = 30) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        AVG(sentiment_score) as avg_score,
        SUM(CASE WHEN sentiment_label = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_label = 'Neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN sentiment_label = 'Negative' THEN 1 ELSE 0 END) as negative_count
      FROM entries
      WHERE timestamp >= datetime('now', '-${days} days')
    `;
    
    db.get(query, [], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Get all entries (for export)
 */
async function getAllEntries() {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      SELECT 
        id,
        timestamp,
        user_text,
        ai_response,
        sentiment_label,
        sentiment_score
      FROM entries
      ORDER BY timestamp DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Update voice played status
 */
async function updateVoicePlayed(entryId) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = 'UPDATE entries SET voice_played = 1 WHERE id = ?';
    
    db.run(query, [entryId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Get user preference
 */
async function getUserPreference(key) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = 'SELECT value FROM user_preferences WHERE key = ?';
    
    db.get(query, [key], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.value : null);
      }
    });
  });
}

/**
 * Set user preference
 */
async function setUserPreference(key, value) {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    
    const query = `
      INSERT OR REPLACE INTO user_preferences (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [key, value], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

module.exports = {
  insertEntry,
  getRecentEntries,
  getMoodHistory,
  getMoodStatistics,
  getAllEntries,
  updateVoicePlayed,
  getUserPreference,
  setUserPreference
};