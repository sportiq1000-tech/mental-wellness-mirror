/**
 * User Model
 * Database operations for user management
 */

const { runQuery, getOne, getAll } = require('./database');
const { hashPassword, verifyPassword } = require('../utils/passwordUtils');
const { DatabaseError, NotFoundError, ConflictError } = require('../utils/errorTypes');

/**
 * Create a new user
 * @param {Object} userData
 * @returns {Promise<Object>} - Created user (without password)
 */
async function createUser(userData) {
  const { email, password, fullName, username, googleId, facebookId, oauthProvider, oauthProfilePicture } = userData;

  try {
    // Hash password if provided (for local registration)
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    const sql = `
      INSERT INTO users (
        email, 
        username, 
        password_hash, 
        full_name,
        google_id,
        facebook_id,
        oauth_provider,
        oauth_profile_picture,
        email_verified,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    // Email verified automatically for OAuth users
    const emailVerified = (googleId || facebookId) ? 1 : 0;

    const result = await runQuery(sql, [
      email.toLowerCase(),
      username || null,
      passwordHash,
      fullName || null,
      googleId || null,
      facebookId || null,
      oauthProvider || null,
      oauthProfilePicture || null,
      emailVerified
    ]);

    // Return created user (without password)
    return await findUserById(result.id);

  } catch (error) {
    // Handle unique constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE')) {
      if (error.message.includes('email')) {
        throw new ConflictError('Email already registered');
      } else if (error.message.includes('username')) {
        throw new ConflictError('Username already taken');
      } else if (error.message.includes('google_id')) {
        throw new ConflictError('Google account already linked');
      } else if (error.message.includes('facebook_id')) {
        throw new ConflictError('Facebook account already linked');
      }
    }
    throw new DatabaseError('Failed to create user', error.message);
  }
}

/**
 * Find user by ID
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
async function findUserById(userId) {
  try {
    const sql = `
      SELECT 
        id,
        email,
        username,
        full_name,
        google_id,
        facebook_id,
        oauth_provider,
        oauth_profile_picture,
        email_verified,
        failed_login_attempts,
        account_locked_until,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `;

    const user = await getOne(sql, [userId]);
    return user || null;

  } catch (error) {
    throw new DatabaseError('Failed to find user by ID', error.message);
  }
}

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
  try {
    const sql = `
      SELECT 
        id,
        email,
        username,
        password_hash,
        full_name,
        google_id,
        facebook_id,
        oauth_provider,
        oauth_profile_picture,
        email_verified,
        failed_login_attempts,
        account_locked_until,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE email = ? AND deleted_at IS NULL
    `;

    const user = await getOne(sql, [email.toLowerCase()]);
    return user || null;

  } catch (error) {
    throw new DatabaseError('Failed to find user by email', error.message);
  }
}

/**
 * Find user by OAuth ID
 * @param {string} provider - 'google' or 'facebook'
 * @param {string} oauthId
 * @returns {Promise<Object|null>}
 */
async function findUserByOAuth(provider, oauthId) {
  try {
    const column = provider === 'google' ? 'google_id' : 'facebook_id';
    const sql = `
      SELECT 
        id,
        email,
        username,
        full_name,
        google_id,
        facebook_id,
        oauth_provider,
        oauth_profile_picture,
        email_verified,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE ${column} = ? AND deleted_at IS NULL
    `;

    const user = await getOne(sql, [oauthId]);
    return user || null;

  } catch (error) {
    throw new DatabaseError('Failed to find user by OAuth ID', error.message);
  }
}

/**
 * Verify user password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object|null>} - User object if valid, null if invalid
 */
async function verifyUserPassword(email, password) {
  try {
    const user = await findUserByEmail(email);
    
    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.account_locked_until) {
      const lockUntil = new Date(user.account_locked_until);
      if (lockUntil > new Date()) {
        throw new Error('ACCOUNT_LOCKED');
      } else {
        // Unlock account if lock period has passed
        await unlockAccount(user.id);
      }
    }

    // Verify password
    if (!user.password_hash) {
      // OAuth user trying to login with password
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      // Increment failed login attempts
      await incrementFailedLoginAttempts(user.id);
      return null;
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(user.id);
    
    // Remove password_hash from returned user
    delete user.password_hash;
    return user;

  } catch (error) {
    if (error.message === 'ACCOUNT_LOCKED') {
      throw error;
    }
    throw new DatabaseError('Failed to verify password', error.message);
  }
}

/**
 * Update user profile
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateUser(userId, updates) {
  try {
    const allowedFields = ['username', 'full_name', 'email'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClause.push(`${key} = ?`);
        values.push(key === 'email' ? value.toLowerCase() : value);
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const sql = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `;

    await runQuery(sql, values);
    return await findUserById(userId);

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      if (error.message.includes('email')) {
        throw new ConflictError('Email already in use');
      } else if (error.message.includes('username')) {
        throw new ConflictError('Username already taken');
      }
    }
    throw new DatabaseError('Failed to update user', error.message);
  }
}

/**
 * Update user password
 * @param {number} userId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function updatePassword(userId, newPassword) {
  try {
    const passwordHash = await hashPassword(newPassword);
    
    const sql = `
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

    await runQuery(sql, [passwordHash, userId]);

  } catch (error) {
    throw new DatabaseError('Failed to update password', error.message);
  }
}

/**
 * Update last login timestamp
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  try {
    const sql = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(sql, [userId]);

  } catch (error) {
    // Non-critical, just log
    console.warn('Failed to update last login:', error.message);
  }
}

/**
 * Increment failed login attempts
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function incrementFailedLoginAttempts(userId) {
  try {
    const sql = `
      UPDATE users
      SET failed_login_attempts = failed_login_attempts + 1,
          account_locked_until = CASE 
            WHEN failed_login_attempts + 1 >= 5 
            THEN datetime('now', '+30 minutes')
            ELSE account_locked_until
          END
      WHERE id = ?
    `;

    await runQuery(sql, [userId]);

  } catch (error) {
    console.warn('Failed to increment login attempts:', error.message);
  }
}

/**
 * Reset failed login attempts
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function resetFailedLoginAttempts(userId) {
  try {
    const sql = `
      UPDATE users
      SET failed_login_attempts = 0,
          account_locked_until = NULL
      WHERE id = ?
    `;

    await runQuery(sql, [userId]);

  } catch (error) {
    console.warn('Failed to reset login attempts:', error.message);
  }
}

/**
 * Unlock account
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function unlockAccount(userId) {
  try {
    const sql = `
      UPDATE users
      SET account_locked_until = NULL,
          failed_login_attempts = 0
      WHERE id = ?
    `;

    await runQuery(sql, [userId]);

  } catch (error) {
    console.warn('Failed to unlock account:', error.message);
  }
}

/**
 * Soft delete user (GDPR compliance)
 * @param {number} userId
 * @returns {Promise<void>}
 */
async function deleteUser(userId) {
  try {
    const sql = `
      UPDATE users
      SET deleted_at = CURRENT_TIMESTAMP,
          email = email || '_DELETED_' || id,
          username = CASE 
            WHEN username IS NOT NULL 
            THEN username || '_DELETED_' || id 
            ELSE NULL 
          END
      WHERE id = ? AND deleted_at IS NULL
    `;

    const result = await runQuery(sql, [userId]);
    
    if (result.changes === 0) {
      throw new NotFoundError('User not found or already deleted');
    }

  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError('Failed to delete user', error.message);
  }
}

/**
 * Link OAuth account to existing user
 * @param {number} userId
 * @param {string} provider - 'google' or 'facebook'
 * @param {string} oauthId
 * @param {string} profilePicture
 * @returns {Promise<void>}
 */
async function linkOAuthAccount(userId, provider, oauthId, profilePicture = null) {
  try {
    const column = provider === 'google' ? 'google_id' : 'facebook_id';
    const sql = `
      UPDATE users
      SET ${column} = ?,
          oauth_provider = ?,
          oauth_profile_picture = COALESCE(?, oauth_profile_picture),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `;

    await runQuery(sql, [oauthId, provider, profilePicture, userId]);

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw new ConflictError(`${provider} account already linked to another user`);
    }
    throw new DatabaseError('Failed to link OAuth account', error.message);
  }
}

/**
 * Get user statistics
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function getUserStats(userId) {
  try {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM entries WHERE user_id = ?) as total_entries,
        (SELECT COUNT(*) FROM sessions WHERE user_id = ?) as total_sessions,
        (SELECT AVG(sentiment_score) FROM entries WHERE user_id = ?) as avg_sentiment
    `;

    const stats = await getOne(sql, [userId, userId, userId]);
    return stats || { total_entries: 0, total_sessions: 0, avg_sentiment: 0 };

  } catch (error) {
    throw new DatabaseError('Failed to get user stats', error.message);
  }
}

module.exports = {
  createUser,
  findUserById,
  findUserByEmail,
  findUserByOAuth,
  verifyUserPassword,
  updateUser,
  updatePassword,
  updateLastLogin,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  unlockAccount,
  deleteUser,
  linkOAuthAccount,
  getUserStats
};