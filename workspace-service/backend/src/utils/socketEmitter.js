/**
 * Socket Event Emitter Utility
 * 
 * Centralized utility for emitting Socket.IO events.
 * Provides a clean interface for emitting events to workspace rooms.
 * 
 * Event Types:
 * - message-created
 * - message-updated
 * - message-deleted
 * - comment-created
 * - comment-updated
 * - comment-deleted
 */

import { logger } from './logger.js';

class SocketEmitter {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize the socket emitter with Socket.IO instance
   * @param {Server} ioInstance - Socket.IO server instance
   */
  initialize(ioInstance) {
    if (!ioInstance) {
      throw new Error('Socket.IO instance is required');
    }
    this.io = ioInstance;
    logger.info('Socket emitter initialized');
  }

  /**
   * Get workspace room name
   * @param {string} workspaceId - Workspace identifier
   * @returns {string} - Room name
   */
  getWorkspaceRoom(workspaceId) {
    return `workspace_${workspaceId}`;
  }

  /**
   * Emit message-created event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} message - Created message data
   */
  emitMessageCreated(workspaceId, message) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    // Emit to all sockets in room, INCLUDING sender
    this.io.to(room).emit('message-created', message);
    this.io.to(room).emit('new-message', message);
    logger.debug(`Emitted message-created and new-message to room ${room}`);
  }

  /**
   * Emit message-updated event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} message - Updated message data
   */
  emitMessageUpdated(workspaceId, message) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    this.io.to(room).emit('message-updated', message);
    logger.debug(`Emitted message-updated to room ${room}`);
  }

  /**
   * Emit message-deleted event
   * @param {string} workspaceId - Workspace identifier
   * @param {string} messageId - Deleted message identifier
   */
  emitMessageDeleted(workspaceId, messageId) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    this.io.to(room).emit('message-deleted', { messageId });
    logger.debug(`Emitted message-deleted to room ${room}`);
  }

  /**
   * Emit comment-created event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} comment - Created comment data
   */
  emitCommentCreated(workspaceId, comment) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    // Emit to all sockets in room, INCLUDING sender
    this.io.to(room).emit('comment-created', comment);
    this.io.to(room).emit('new-comment', comment);
    logger.debug(`Emitted comment-created and new-comment to room ${room}`);
  }

  /**
   * Emit comment-updated event
   * @param {string} workspaceId - Workspace identifier
   * @param {Object} comment - Updated comment data
   */
  emitCommentUpdated(workspaceId, comment) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    this.io.to(room).emit('comment-updated', comment);
    logger.debug(`Emitted comment-updated to room ${room}`);
  }

  /**
   * Emit comment-deleted event
   * @param {string} workspaceId - Workspace identifier
   * @param {string} commentId - Deleted comment identifier
   */
  emitCommentDeleted(workspaceId, commentId) {
    if (!this.io) {
      logger.warn('Socket emitter not initialized. Event not emitted.');
      return;
    }

    const room = this.getWorkspaceRoom(workspaceId);
    this.io.to(room).emit('comment-deleted', { commentId });
    logger.debug(`Emitted comment-deleted to room ${room}`);
  }
}

// Export singleton instance
export default new SocketEmitter();
