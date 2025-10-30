/**
 * Database Model - SQLite Schema & Initialization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/mental_wellness.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('📊 Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

/**
 * Initialize database tables
 */
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Table 1: entries (main journal entries)
      db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          user_text TEXT NOT NULL,
          ai_response TEXT NOT NULL,
          sentiment_label TEXT NOT NULL,
          sentiment_score REAL NOT NULL,
          sentiment_details TEXT,
          voice_played INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating entries table:', err);
          reject(err);
        }
      });

      // Create indexes for entries table
      db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON entries(timestamp)');
      db.run('CREATE INDEX IF NOT EXISTS idx_sentiment_label ON entries(sentiment_label)');

      // Table 2: mood_statistics (daily aggregates)
      db.run(`
        CREATE TABLE IF NOT EXISTS mood_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          entry_count INTEGER DEFAULT 0,
          avg_sentiment REAL,
          positive_count INTEGER DEFAULT 0,
          neutral_count INTEGER DEFAULT 0,
          negative_count INTEGER DEFAULT 0,
          dominant_emotion TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating mood_statistics table:', err);
          reject(err);
        }
      });

      // Table 3: user_preferences (app settings)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_preferences table:', err);
          reject(err);
        }
      });

      // Insert default preferences if not exist
      db.run(`
        INSERT OR IGNORE INTO user_preferences (key, value) 
        VALUES 
          ('theme', 'light'),
          ('voice_enabled', 'false'),
          ('location_consent', 'false')
      `, (err) => {
        if (err) {
          console.error('Error inserting default preferences:', err);
          reject(err);
        } else {
          console.log('✅ Database tables initialized');
          resolve();
        }
      });
    });
  });
}

/**
 * Get database connection
 */
function getDatabase() {
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('📊 Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};