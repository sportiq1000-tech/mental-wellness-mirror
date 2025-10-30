/**
 * Authentication Service
 * Business logic for user authentication
 */

const User = require('../models/User');
const { validatePasswordStrength } = require('../utils/passwordUtils');
const { validateRegistration, validateLogin } = require('../utils/validators');
const {
  AuthenticationError,
  ValidationError,
  ConflictError,
  AccountLockedError
} = require('../utils/errorTypes');

/**
 * Register a new user
 * @param {Object} registrationData
 * @returns {Promise<Object>} - Created user
 */
async function register(registrationData) {
  const { email, password, fullName, username } = registrationData;

  try {
    // Validate input
    validateRegistration({ email, password, fullName, username });

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors);
    }

    // Check if user already exists
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user
    const user = await User.createUser({
      email,
      password,
      fullName,
      username
    });

    console.log(`✅ New user registered: ${email} (ID: ${user.id})`);

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      username: user.username,
      createdAt: user.created_at
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    throw new Error('Registration failed: ' + error.message);
  }
}

/**
 * Login user with email and password
 * @param {Object} loginData
 * @returns {Promise<Object>} - User data
 */
async function login(loginData) {
  const { email, password } = loginData;

  try {
    // Validate input
    validateLogin({ email, password });

    // Verify credentials
    const user = await User.verifyUserPassword(email, password);

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await User.updateLastLogin(user.id);

    console.log(`✅ User logged in: ${email} (ID: ${user.id})`);

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      username: user.username,
      emailVerified: user.email_verified === 1,
      lastLogin: user.last_login
    };

  } catch (error) {
    if (error.message === 'ACCOUNT_LOCKED') {
      throw new AccountLockedError('Account is temporarily locked due to multiple failed login attempts');
    }
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Login failed: ' + error.message);
  }
}

/**
 * OAuth login/registration
 * @param {Object} oauthData
 * @returns {Promise<Object>} - User data and isNewUser flag
 */
async function oauthLogin(oauthData) {
  const { provider, oauthId, email, fullName, profilePicture } = oauthData;

  try {
    // Check if user exists with this OAuth ID
    let user = await User.findUserByOAuth(provider, oauthId);

    let isNewUser = false;

    if (!user) {
      // Check if user exists with this email
      user = await User.findUserByEmail(email);

      if (user) {
        // Link OAuth account to existing user
        await User.linkOAuthAccount(user.id, provider, oauthId, profilePicture);
        console.log(`✅ OAuth account linked: ${provider} to user ${email}`);
      } else {
        // Create new user
        user = await User.createUser({
          email,
          fullName,
          googleId: provider === 'google' ? oauthId : null,
          facebookId: provider === 'facebook' ? oauthId : null,
          oauthProvider: provider,
          oauthProfilePicture: profilePicture
        });
        isNewUser = true;
        console.log(`✅ New user created via ${provider}: ${email} (ID: ${user.id})`);
      }
    }

    // Update last login
    await User.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        username: user.username,
        profilePicture: user.oauth_profile_picture,
        emailVerified: true // OAuth users are auto-verified
      },
      isNewUser
    };

  } catch (error) {
    throw new Error(`OAuth ${provider} login failed: ` + error.message);
  }
}

/**
 * Change user password
 * @param {number} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function changePassword(userId, currentPassword, newPassword) {
  try {
    // Get user
    const user = await User.findUserById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get user with password hash
    const userWithPassword = await User.findUserByEmail(user.email);

    // Verify current password
    const { verifyPassword } = require('../utils/passwordUtils');
    const isValid = await verifyPassword(currentPassword, userWithPassword.password_hash);

    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError('New password does not meet requirements', passwordValidation.errors);
    }

    // Check new password is different from current
    if (currentPassword === newPassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Update password
    await User.updatePassword(userId, newPassword);

    console.log(`✅ Password changed for user ID: ${userId}`);

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      throw error;
    }
    throw new Error('Password change failed: ' + error.message);
  }
}

/**
 * Get user profile
 * @param {number} userId
 * @returns {Promise<Object>}
 */
async function getProfile(userId) {
  try {
    const user = await User.findUserById(userId);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get user stats
    const stats = await User.getUserStats(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      profilePicture: user.oauth_profile_picture,
      emailVerified: user.email_verified === 1,
      oauthProvider: user.oauth_provider,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      stats
    };

  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new Error('Failed to get profile: ' + error.message);
  }
}

/**
 * Update user profile
 * @param {number} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateProfile(userId, updates) {
  try {
    const { validateProfileUpdate } = require('../utils/validators');
    validateProfileUpdate(updates);

    const user = await User.updateUser(userId, updates);

    console.log(`✅ Profile updated for user ID: ${userId}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      updatedAt: user.updated_at
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      throw error;
    }
    throw new Error('Profile update failed: ' + error.message);
  }
}

/**
 * Delete user account
 * @param {number} userId
 * @param {string} password - Required for confirmation
 * @returns {Promise<void>}
 */
async function deleteAccount(userId, password) {
  try {
    // Get user
    const user = await User.findUserById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify password if user has one (not OAuth-only)
    const userWithPassword = await User.findUserByEmail(user.email);
    if (userWithPassword.password_hash) {
      const { verifyPassword } = require('../utils/passwordUtils');
      const isValid = await verifyPassword(password, userWithPassword.password_hash);

      if (!isValid) {
        throw new AuthenticationError('Password is incorrect');
      }
    }

    // Soft delete user
    await User.deleteUser(userId);

    console.log(`✅ User account deleted: ${user.email} (ID: ${userId})`);

  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new Error('Account deletion failed: ' + error.message);
  }
}

module.exports = {
  register,
  login,
  oauthLogin,
  changePassword,
  getProfile,
  updateProfile,
  deleteAccount
};