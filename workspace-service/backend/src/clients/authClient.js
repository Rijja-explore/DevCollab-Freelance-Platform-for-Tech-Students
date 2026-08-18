/**
 * Auth Service Client
 * 
 * Integration layer for Auth Service (Person A).
 * Currently uses mock implementations until Auth Service is ready.
 * 
 * When Person A completes the Auth Service:
 * 1. Replace mock implementations with actual HTTP requests
 * 2. No changes needed in Controllers, Services, or other modules
 * 
 * Design Principles:
 * - Clean interface that matches expected Auth Service API
 * - Production-ready error handling structure
 * - Easy to switch from mock to real implementation
 */

import { logger } from '../utils/logger.js';
import { servicesConfig, isServiceEnabled } from '../config/services.js';

/**
 * Auth Service Client Class
 */
class AuthClient {
  constructor() {
    this.config = servicesConfig.auth;
    this.isEnabled = isServiceEnabled('auth');
  }

  /**
   * Get user information by user ID
   * 
   * CURRENT: Returns mock user data
   * FUTURE: Will call GET /api/users/:userId on Auth Service
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} - User information
   */
  async getUser(userId) {
    try {
      if (!this.isEnabled) {
        return this._mockGetUser(userId);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.get(
      //   `${this.config.baseUrl}/api/users/${userId}`,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockGetUser(userId);
    } catch (error) {
      logger.error(`Auth Service error - getUser(${userId}):`, error.message);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Validate if a user exists and is active
   * 
   * CURRENT: Returns mock validation
   * FUTURE: Will call GET /api/users/:userId/validate on Auth Service
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} - Validation result
   */
  async validateUser(userId) {
    try {
      if (!this.isEnabled) {
        return this._mockValidateUser(userId);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.get(
      //   `${this.config.baseUrl}/api/users/${userId}/validate`,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockValidateUser(userId);
    } catch (error) {
      logger.error(`Auth Service error - validateUser(${userId}):`, error.message);
      throw new Error('Failed to validate user');
    }
  }

  /**
   * Get multiple users by IDs
   * 
   * CURRENT: Returns mock user data for batch
   * FUTURE: Will call POST /api/users/batch on Auth Service
   * 
   * @param {string[]} userIds - Array of user identifiers
   * @returns {Promise<Object[]>} - Array of user information
   */
  async getUsersBatch(userIds) {
    try {
      if (!this.isEnabled) {
        return this._mockGetUsersBatch(userIds);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/users/batch`,
      //   { userIds },
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockGetUsersBatch(userIds);
    } catch (error) {
      logger.error(`Auth Service error - getUsersBatch:`, error.message);
      throw new Error('Failed to get users batch');
    }
  }

  /**
   * Check if user has permission for a workspace
   * 
   * CURRENT: Returns mock permission check (always true)
   * FUTURE: Will call POST /api/users/:userId/permissions on Auth Service
   * 
   * @param {string} userId - User identifier
   * @param {string} workspaceId - Workspace identifier
   * @param {string} action - Action to check (read, write, delete)
   * @returns {Promise<Object>} - Permission result
   */
  async checkWorkspacePermission(userId, workspaceId, action = 'read') {
    try {
      if (!this.isEnabled) {
        return this._mockCheckPermission(userId, workspaceId, action);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/users/${userId}/permissions`,
      //   { workspaceId, action },
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockCheckPermission(userId, workspaceId, action);
    } catch (error) {
      logger.error(`Auth Service error - checkWorkspacePermission:`, error.message);
      throw new Error('Failed to check workspace permission');
    }
  }

  // ============================================================================
  // MOCK IMPLEMENTATIONS
  // These will be removed when Auth Service is ready
  // ============================================================================

  /**
   * Mock: Get user information
   * @private
   */
  _mockGetUser(userId) {
    logger.debug(`[Mock Auth Service] getUser(${userId})`);
    
    return {
      success: true,
      data: {
        id: userId,
        exists: true,
        active: true,
        // Mock data - Auth Service will provide real user details
        username: `user_${userId}`,
        email: `${userId}@example.com`,
        role: 'user',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Mock: Validate user
   * @private
   */
  _mockValidateUser(userId) {
    logger.debug(`[Mock Auth Service] validateUser(${userId})`);
    
    return {
      success: true,
      data: {
        valid: true,
        exists: true,
        active: true,
        userId: userId,
      },
    };
  }

  /**
   * Mock: Get users batch
   * @private
   */
  _mockGetUsersBatch(userIds) {
    logger.debug(`[Mock Auth Service] getUsersBatch([${userIds.join(', ')}])`);
    
    return {
      success: true,
      data: userIds.map(id => ({
        id,
        exists: true,
        active: true,
        username: `user_${id}`,
        email: `${id}@example.com`,
        role: 'user',
      })),
    };
  }

  /**
   * Mock: Check workspace permission
   * @private
   */
  _mockCheckPermission(userId, workspaceId, action) {
    logger.debug(
      `[Mock Auth Service] checkWorkspacePermission(user: ${userId}, workspace: ${workspaceId}, action: ${action})`
    );
    
    return {
      success: true,
      data: {
        allowed: true,
        userId,
        workspaceId,
        action,
        role: 'member',
      },
    };
  }
}

// Export singleton instance
export default new AuthClient();
