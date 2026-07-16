import axios from 'axios';

/**
 * API Service Layer
 * 
 * Centralized HTTP client for all API calls.
 * Handles:
 * - Base URL configuration
 * - Default headers
 * - Error handling
 * - Request/response interceptors (can be added here later)
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - add auth token, logging, etc.
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - handle errors, refresh tokens, etc.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized (redirect to login)
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      // Redirect to login (to be implemented)
    }
    return Promise.reject(error);
  }
);

/**
 * Health check endpoint
 */
export const getHealthStatus = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch health status');
  }
};

// Future API methods will be added here for:
// - Workspace creation/management
// - Chat and messaging
// - Comments and threads
// - User presence
// - Etc.

export default apiClient;
