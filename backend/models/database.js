/**
 * Database Model - SQLite Schema & Initialization
 * Updated with authentication and user management
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
    console.log('📊 Connected to SQLite database at:', DB_PATH);
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
      
      // ============================================
      // USER AUTHENTICATION TABLES
      // ============================================
      
      // Table 1: users
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE,
          password_hash TEXT,
          full_name TEXT,
          
          -- OAuth fields
          google_id TEXT UNIQUE,
          facebook_id TEXT UNIQUE,
          oauth_provider TEXT,
          oauth_profile_picture TEXT,
          
          -- Verification (skip for now, but schema ready)
          email_verified INTEGER DEFAULT 0,
          verification_token TEXT,
          verification_token_expires TEXT,
          
          -- Password reset (skip for now, but schema ready)
          reset_token TEXT,
          reset_token_expires TEXT,
          
          -- Security
          failed_login_attempts INTEGER DEFAULT 0,
          account_locked_until TEXT,
          last_login TEXT,
          
          -- Metadata
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          
          -- Constraints
          CHECK (
            (password_hash IS NOT NULL) OR 
            (google_id IS NOT NULL) OR 
            (facebook_id IS NOT NULL)
          )
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err);
          reject(err);
          return;
        }
        console.log('✅ Users table ready');
      });

      // Create indexes for users table
      db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_facebook ON users(facebook_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at)');

      // Table 2: refresh_tokens
      db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          revoked INTEGER DEFAULT 0,
          revoked_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating refresh_tokens table:', err);
          reject(err);
          return;
        }
        console.log('✅ Refresh tokens table ready');
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token)');
      db.run('CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_refresh_expires ON refresh_tokens(expires_at)');

      // Table 3: sessions (track user devices/logins)
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          device_info TEXT,
          ip_address TEXT,
          user_agent TEXT,
          last_active TEXT DEFAULT CURRENT_TIMESTAMP,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating sessions table:', err);
          reject(err);
          return;
        }
        console.log('✅ Sessions table ready');
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_session_active ON sessions(last_active)');

      // ============================================
      // APPLICATION DATA TABLES (User-specific)
      // ============================================

      // Table 4: entries (journal entries - now user-specific)
      db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          user_text TEXT NOT NULL,
          ai_response TEXT NOT NULL,
          sentiment_label TEXT NOT NULL,
          sentiment_score REAL NOT NULL,
          sentiment_details TEXT,
          voice_played INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating entries table:', err);
          reject(err);
          return;
        }
        console.log('✅ Entries table ready');
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp)');
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_sentiment ON entries(sentiment_label)');

      // Table 5: mood_statistics (daily aggregates - user-specific)
      db.run(`
        CREATE TABLE IF NOT EXISTS mood_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          entry_count INTEGER DEFAULT 0,
          avg_sentiment REAL,
          positive_count INTEGER DEFAULT 0,
          neutral_count INTEGER DEFAULT 0,
          negative_count INTEGER DEFAULT 0,
          dominant_emotion TEXT,
          UNIQUE(user_id, date),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating mood_statistics table:', err);
          reject(err);
          return;
        }
        console.log('✅ Mood statistics table ready');
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_statistics(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_mood_date ON mood_statistics(date)');

      // Table 6: user_preferences (app settings - user-specific)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, key),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating user_preferences table:', err);
          reject(err);
          return;
        }
        console.log('✅ User preferences table ready');
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_prefs_user ON user_preferences(user_id)');

      // ============================================
      // CLEANUP & FINALIZATION
      // ============================================

      // Clean up expired refresh tokens on startup
      db.run(`
        UPDATE refresh_tokens 
        SET revoked = 1, revoked_at = CURRENT_TIMESTAMP 
        WHERE expires_at < datetime('now') AND revoked = 0
      `, (err) => {
        if (err) {
          console.error('⚠️ Warning: Could not clean expired tokens:', err);
        } else {
          console.log('🧹 Cleaned up expired refresh tokens');
        }
      });

      // Success
      console.log('✅ Database schema initialized successfully');
      resolve();
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

/**
 * Utility: Run a query and return promise
 */
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Utility: Get single row
 */
function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Utility: Get all rows
 */
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runQuery,
  getOne,
  getAll
};