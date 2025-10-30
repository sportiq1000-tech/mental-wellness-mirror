/**
 * Authentication Manager
 * Handles JWT tokens, auto-refresh, and auth state
 */

class AuthManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.refreshTimer = null;
    
    // Load tokens from storage on init
    this.loadFromStorage();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken && !this.isTokenExpired(this.accessToken);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Set authentication data
   */
  setAuth(tokens, user) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = user;
    
    // Save to localStorage
    this.saveToStorage();
    
    // Schedule token refresh
    this.scheduleTokenRefresh();
    
    console.log('✅ Authentication set for user:', user.email);
  }

  /**
   * Clear authentication data (logout)
   */
  clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    
    // Clear storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Cancel refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    console.log('✅ Authentication cleared');
  }

  /**
   * Save tokens to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
      localStorage.setItem('user', JSON.stringify(this.user));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  /**
   * Load tokens from localStorage
   */
  loadFromStorage() {
    try {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.user = JSON.parse(userStr);
      }
      
      // Validate and refresh if needed
      if (this.accessToken) {
        if (this.isTokenExpired(this.accessToken)) {
          console.log('⚠️ Access token expired, attempting refresh...');
          this.refreshAccessToken();
        } else {
          this.scheduleTokenRefresh();
        }
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      this.clearAuth();
    }
  }

  /**
   * Decode JWT token (without verification)
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    if (!token) return true;
    
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    // Add 60 second buffer
    return decoded.exp < (now + 60);
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.accessToken) return;

    const decoded = this.decodeToken(this.accessToken);
    if (!decoded || !decoded.exp) return;

    // Refresh 2 minutes before expiry
    const expiresIn = (decoded.exp * 1000) - Date.now();
    const refreshIn = Math.max(expiresIn - (2 * 60 * 1000), 0);

    console.log(`🔄 Token refresh scheduled in ${Math.round(refreshIn / 1000)}s`);

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshIn);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      console.log('⚠️ No refresh token available');
      this.clearAuth();
      window.location.href = '/pages/login.html';
      return false;
    }

    try {
      console.log('🔄 Refreshing access token...');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.success && data.data.tokens) {
        this.accessToken = data.data.tokens.accessToken;
        this.refreshToken = data.data.tokens.refreshToken;
        this.saveToStorage();
        this.scheduleTokenRefresh();
        
        console.log('✅ Token refreshed successfully');
        return true;
      } else {
        throw new Error('Invalid refresh response');
      }

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.clearAuth();
      window.location.href = '/pages/login.html';
      return false;
    }
  }

  /**
   * Logout (revoke tokens on server)
   */
  async logout() {
    try {
      if (this.refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: JSON.stringify({
            refreshToken: this.refreshToken
          })
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearAuth();
      window.location.href = '/pages/login.html';
    }
  }

  /**
   * Require authentication (redirect if not authenticated)
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      console.log('⚠️ Authentication required, redirecting to login...');
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  }
}

// Create global instance
window.authManager = new AuthManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}