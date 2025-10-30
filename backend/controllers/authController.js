/**
 * Authentication Controller
 * Handles registration, login, logout, token refresh
 */

const authService = require('../services/authService');
const tokenService = require('../services/tokenService');
const sessionModel = require('../models/Session');
const { catchAsync } = require('../middleware/errorHandler');
const { AuthenticationError, ValidationError } = require('../utils/errorTypes');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = catchAsync(async (req, res) => {
  const { email, password, fullName, username } = req.body;

  // Register user
  const user = await authService.register({
    email,
    password,
    fullName,
    username
  });

  // Generate tokens
  const tokens = await tokenService.generateTokenPair(user);

  // Create session
  const deviceInfo = sessionModel.parseDeviceInfo(req.headers['user-agent']);
  await sessionModel.createSession({
    userId: user.id,
    deviceInfo,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      }
    }
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Authenticate user
  const user = await authService.login({ email, password });

  // Generate tokens
  const tokens = await tokenService.generateTokenPair(user);

  // Create or update session
  const deviceInfo = sessionModel.parseDeviceInfo(req.headers['user-agent']);
  await sessionModel.findOrCreateSession({
    userId: user.id,
    deviceInfo,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
        emailVerified: user.emailVerified
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      }
    }
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  // Refresh tokens
  const tokens = await tokenService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType
      }
    }
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 * Requires authentication
 */
const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Revoke refresh token
    await tokenService.revokeToken(refreshToken);
  }

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 * Requires authentication
 */
const logoutAll = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Revoke all refresh tokens
  await tokenService.revokeAllUserTokens(userId);

  // Delete all sessions
  await sessionModel.deleteAllUserSessions(userId);

  res.json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 */
const getCurrentUser = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Get full user profile
  const profile = await authService.getProfile(userId);

  res.json({
    success: true,
    data: {
      user: profile
    }
  });
});

/**
 * Verify email (placeholder for future implementation)
 * POST /api/auth/verify-email
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new ValidationError('Verification token is required');
  }

  // TODO: Implement email verification logic
  // For now, return success
  res.json({
    success: true,
    message: 'Email verification feature coming soon'
  });
});

/**
 * Request password reset (placeholder for future implementation)
 * POST /api/auth/forgot-password
 */
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  // TODO: Implement password reset email logic
  // For now, return success (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link will be sent'
  });
});

/**
 * Reset password (placeholder for future implementation)
 * POST /api/auth/reset-password
 */
const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError('Token and new password are required');
  }

  // TODO: Implement password reset logic
  res.json({
    success: true,
    message: 'Password reset feature coming soon'
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 * Requires authentication
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  await authService.changePassword(userId, currentPassword, newPassword);

  // Revoke all other tokens (force re-login on other devices)
  await tokenService.revokeAllUserTokens(userId);

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again on all devices.'
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword
};