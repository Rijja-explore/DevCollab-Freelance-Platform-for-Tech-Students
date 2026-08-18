/**
 * Workspace Socket Handlers
 * 
 * Handles Socket.IO events for workspace rooms.
 * 
 * Client → Server Events:
 * - join-workspace: Join a workspace room
 * - leave-workspace: Leave a workspace room
 * 
 * Server → Client Events (emitted by controllers):
 * - message-created
 * - message-updated
 * - message-deleted
 * - comment-created
 * - comment-updated
 * - comment-deleted
 */

import { logger } from '../utils/logger.js';
import socketEmitter from '../utils/socketEmitter.js';
import mongoose from 'mongoose';

/**
 * Handle workspace room operations
 * @param {Socket} socket - Socket.IO socket instance
 */
export const handleWorkspaceSocket = (socket) => {
  /**
   * Join workspace room
   * Client emits: { workspaceId: string }
   */
  socket.on('join-workspace', async (data) => {
    try {
      const { workspaceId } = data;

      // Validate workspaceId
      if (!workspaceId) {
        socket.emit('error', { message: 'Workspace ID is required' });
        return;
      }

      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        socket.emit('error', { message: 'Invalid workspace ID format' });
        return;
      }

      // Get room name
      const room = socketEmitter.getWorkspaceRoom(workspaceId);

      // Join the room
      socket.join(room);

      logger.info(`User ${socket.user.id} joined workspace room: ${room} (socket: ${socket.id})`);

      // Acknowledge successful join
      socket.emit('joined-workspace', {
        workspaceId,
        room,
        message: 'Successfully joined workspace'
      });
    } catch (error) {
      logger.error(`Error joining workspace: ${error.message}`);
      socket.emit('error', { message: 'Failed to join workspace' });
    }
  });

  /**
   * Leave workspace room
   * Client emits: { workspaceId: string }
   */
  socket.on('leave-workspace', async (data) => {
    try {
      const { workspaceId } = data;

      // Validate workspaceId
      if (!workspaceId) {
        socket.emit('error', { message: 'Workspace ID is required' });
        return;
      }

      // Get room name
      const room = socketEmitter.getWorkspaceRoom(workspaceId);

      // Leave the room
      socket.leave(room);

      logger.info(`User ${socket.user.id} left workspace room: ${room} (socket: ${socket.id})`);

      // Acknowledge successful leave
      socket.emit('left-workspace', {
        workspaceId,
        room,
        message: 'Successfully left workspace'
      });
    } catch (error) {
      logger.error(`Error leaving workspace: ${error.message}`);
      socket.emit('error', { message: 'Failed to leave workspace' });
    }
  });

  /**
   * Handle socket disconnect
   */
  socket.on('disconnect', (reason) => {
    logger.info(`User ${socket.user.id} disconnected (socket: ${socket.id}): ${reason}`);
  });
};

export default handleWorkspaceSocket;
