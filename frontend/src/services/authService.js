import api from './api';

/**
 * Authentication service for handling login, logout, and token management
 */
const authService = {
  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: object}>}
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Logout current user
   * @returns {Promise<void>}
   */
  logout: async () => {
    await api.post('/auth/logout');
  },

  /**
   * Get current user information
   * @returns {Promise<{user: object}>}
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Store JWT token in localStorage
   * @param {string} token - JWT token
   */
  setToken: (token) => {
    localStorage.setItem('token', token);
  },

  /**
   * Get JWT token from localStorage
   * @returns {string|null}
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Remove JWT token from localStorage
   */
  removeToken: () => {
    localStorage.removeItem('token');
  },

  /**
   * Check if token is expired
   * @returns {boolean}
   */
  isTokenExpired: () => {
    const token = authService.getToken();
    if (!token) return true;

    try {
      // JWT tokens have 3 parts separated by dots
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      // If token parsing fails, consider it expired
      return true;
    }
  }
};

export default authService;
