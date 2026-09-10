/**
 * Notification Service Client
 * 
 * Integration layer for Notification Service (Person C).
 * Currently uses mock implementations until Notification Service is ready.
 * 
 * When Person C completes the Notification Service:
 * 1. Replace mock implementations with actual HTTP requests
 * 2. No changes needed in Controllers, Services, or other modules
 * 
 * Design Principles:
 * - Clean interface for all notification types
 * - Production-ready error handling structure
 * - Easy to switch from mock to real implementation
 * - Non-blocking - failures don't affect main operations
 */

import { logger } from '../utils/logger.js';
import { servicesConfig, isServiceEnabled } from '../config/services.js';

/**
 * Notification Service Client Class
 */
class NotificationClient {
  constructor() {
    this.config = servicesConfig.notification;
    this.isEnabled = isServiceEnabled('notification');
  }

  /**
   * Send notification for message created
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/message-created on Notification Service
   * 
   * @param {Object} data - Notification data
   * @param {string} data.workspaceId - Workspace identifier
   * @param {string} data.messageId - Message identifier
   * @param {string} data.senderId - Sender user identifier
   * @param {string} data.text - Message text
   * @returns {Promise<Object>} - Notification result
   */
  async sendMessageCreated(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('message-created', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/message-created`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('message-created', data);
    } catch (error) {
      logger.error('Notification Service error - sendMessageCreated:', error.message);
      // Non-blocking: Don't throw error, just log it
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for message updated
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/message-updated on Notification Service
   * 
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendMessageUpdated(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('message-updated', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/message-updated`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('message-updated', data);
    } catch (error) {
      logger.error('Notification Service error - sendMessageUpdated:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for message deleted
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/message-deleted on Notification Service
   * 
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendMessageDeleted(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('message-deleted', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/message-deleted`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('message-deleted', data);
    } catch (error) {
      logger.error('Notification Service error - sendMessageDeleted:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for comment created
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/comment-created on Notification Service
   * 
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendCommentCreated(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('comment-created', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/comment-created`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('comment-created', data);
    } catch (error) {
      logger.error('Notification Service error - sendCommentCreated:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for comment updated
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/comment-updated on Notification Service
   * 
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendCommentUpdated(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('comment-updated', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/comment-updated`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('comment-updated', data);
    } catch (error) {
      logger.error('Notification Service error - sendCommentUpdated:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for comment deleted
   * 
   * CURRENT: Logs mock notification
   * FUTURE: Will call POST /api/notifications/comment-deleted on Notification Service
   * 
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendCommentDeleted(data) {
    try {
      if (!this.isEnabled) {
        return this._mockSendNotification('comment-deleted', data);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/comment-deleted`,
      //   data,
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendNotification('comment-deleted', data);
    } catch (error) {
      logger.error('Notification Service error - sendCommentDeleted:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk notifications (for batch operations in the future)
   * 
   * CURRENT: Logs mock notifications
   * FUTURE: Will call POST /api/notifications/bulk on Notification Service
   * 
   * @param {Object[]} notifications - Array of notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendBulkNotifications(notifications) {
    try {
      if (!this.isEnabled) {
        return this._mockSendBulkNotifications(notifications);
      }

      // FUTURE IMPLEMENTATION:
      // const response = await axios.post(
      //   `${this.config.baseUrl}/api/notifications/bulk`,
      //   { notifications },
      //   { timeout: this.config.timeout }
      // );
      // return response.data;

      // For now, use mock
      return this._mockSendBulkNotifications(notifications);
    } catch (error) {
      logger.error('Notification Service error - sendBulkNotifications:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // MOCK IMPLEMENTATIONS
  // These will be removed when Notification Service is ready
  // ============================================================================

  /**
   * Mock: Send notification
   * @private
   */
  _mockSendNotification(type, data) {
    logger.info(`[Mock Notification Service] ${type}`);
    logger.debug(`   Workspace: ${data.workspaceId || 'N/A'}`);
    logger.debug(`   User: ${data.senderId || data.authorId || 'N/A'}`);
    
    if (data.messageId) {
      logger.debug(`   Message ID: ${data.messageId}`);
    }
    if (data.commentId) {
      logger.debug(`   Comment ID: ${data.commentId}`);
    }
    if (data.text) {
      logger.debug(`   Text: ${data.text.substring(0, 50)}...`);
    }

    return {
      success: true,
      notificationId: `mock-notif-${Date.now()}`,
      type,
      sent: true,
    };
  }

  /**
   * Mock: Send bulk notifications
   * @private
   */
  _mockSendBulkNotifications(notifications) {
    logger.info(`[Mock Notification Service] Bulk notifications (${notifications.length} items)`);
    
    notifications.forEach((notif, index) => {
      logger.debug(`   ${index + 1}. ${notif.type} - Workspace: ${notif.workspaceId}`);
    });

    return {
      success: true,
      count: notifications.length,
      sent: true,
    };
  }
}

// Export singleton instance
export default new NotificationClient();
