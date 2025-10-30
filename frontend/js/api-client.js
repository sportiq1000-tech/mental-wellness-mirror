/**
 * API Client
 * Centralized API wrapper with authentication
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Add authentication header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (window.authManager && window.authManager.isAuthenticated()) {
      headers['Authorization'] = `Bearer ${window.authManager.getAccessToken()}`;
    }

    // Make request
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 (token expired)
      if (response.status === 401) {
        console.log('⚠️ 401 Unauthorized - attempting token refresh...');
        
        // Try to refresh token
        const refreshed = await window.authManager.refreshAccessToken();
        
        if (refreshed) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${window.authManager.getAccessToken()}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse(retryResponse);
        } else {
          // Refresh failed, redirect to login
          window.location.href = '/pages/login.html';
          throw new Error('Authentication required');
        }
      }

      return this.handleResponse(response);

    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new APIError(
          data.error?.message || 'Request failed',
          response.status,
          data.error?.code,
          data.error?.details
        );
      }
      
      return data;
    }
    
    if (!response.ok) {
      throw new APIError('Request failed', response.status);
    }
    
    return response;
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async register(email, password, fullName, username) {
    return this.post('/api/auth/register', {
      email,
      password,
      fullName,
      username
    });
  }

  async login(email, password) {
    return this.post('/api/auth/login', {
      email,
      password
    });
  }

  async logout() {
    return window.authManager.logout();
  }

  async getCurrentUser() {
    return this.get('/api/auth/me');
  }

  // ============================================
  // CHAT ENDPOINTS
  // ============================================

  async sendChatMessage(text, includeContext = true) {
    return this.post('/api/chat', {
      text,
      includeContext
    });
  }

  async getChatHistory(limit = 20, offset = 0) {
    return this.get('/api/chat/history', { limit, offset });
  }

  async deleteChatEntry(entryId) {
    return this.delete(`/api/chat/${entryId}`);
  }

  // ============================================
  // MOOD ENDPOINTS
  // ============================================

  async logMood(mood, note = '', intensity = 3) {
    return this.post('/api/moods', {
      mood,
      note,
      intensity
    });
  }

  async getMoodHistory(days = 30) {
    return this.get('/api/moods/history', { days });
  }

  async getMoodStats(days = 30) {
    return this.get('/api/moods/stats', { days });
  }

  // ============================================
  // VOICE ENDPOINTS
  // ============================================

  async generateVoice(text, language = 'en', slow = false, gender = 'female') {
    return this.post('/api/voice/generate', {
      text,
      language,
      slow,
      gender
    });
  }

  // ============================================
  // USER ENDPOINTS
  // ============================================

  async getProfile() {
    return this.get('/api/user/profile');
  }

  async updateProfile(updates) {
    return this.put('/api/user/profile', updates);
  }

  async changePassword(currentPassword, newPassword) {
    return this.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
  }

  async deleteAccount(password) {
    return this.delete('/api/user/account', {
      body: JSON.stringify({ password })
    });
  }

  async getUserStats() {
    return this.get('/api/user/stats');
  }

  async getSessions() {
    return this.get('/api/user/sessions');
  }

  async deleteSession(sessionId) {
    return this.delete(`/api/user/sessions/${sessionId}`);
  }
}

/**
 * Custom API Error
 */
class APIError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Create global instance
window.api = new APIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, APIError };
}