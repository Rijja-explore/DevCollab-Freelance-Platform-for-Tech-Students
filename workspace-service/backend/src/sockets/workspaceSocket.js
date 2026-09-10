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
   * Client emits: { workspaceId: string } or 'workspaceId'
   */
  socket.on('join-workspace', async (data) => {
    try {
      const workspaceId = typeof data === 'string' ? data : data?.workspaceId;

      if (!workspaceId) {
        socket.emit('error', { message: 'Workspace ID is required' });
        return;
      }

      // Get room name
      const room = socketEmitter.getWorkspaceRoom(workspaceId);

      // Join the room
      socket.join(room);

      const userId = socket.user?.id || 'anonymous';
      logger.info(`User ${userId} joined workspace room: ${room} (socket: ${socket.id})`);

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
   * Real-time client-to-room message broadcast
   */
  socket.on('send-message', (msgPayload) => {
    try {
      const workspaceId = msgPayload?.workspaceId;
      if (workspaceId) {
        const room = socketEmitter.getWorkspaceRoom(workspaceId);
        socket.to(room).emit('new-message', msgPayload);
        socket.to(room).emit('message-created', msgPayload);
      }
    } catch (error) {
      logger.error(`Error broadcasting socket message: ${error.message}`);
    }
  });

  /**
   * Real-time client-to-room code comment broadcast
   */
  socket.on('send-comment', (cmtPayload) => {
    try {
      const workspaceId = cmtPayload?.workspaceId;
      if (workspaceId) {
        const room = socketEmitter.getWorkspaceRoom(workspaceId);
        socket.to(room).emit('new-comment', cmtPayload);
        socket.to(room).emit('comment-created', cmtPayload);
      }
    } catch (error) {
      logger.error(`Error broadcasting socket comment: ${error.message}`);
    }
  });

  /**
   * Leave workspace room
   */
  socket.on('leave-workspace', async (data) => {
    try {
      const workspaceId = typeof data === 'string' ? data : data?.workspaceId;

      if (!workspaceId) {
        socket.emit('error', { message: 'Workspace ID is required' });
        return;
      }

      const room = socketEmitter.getWorkspaceRoom(workspaceId);
      socket.leave(room);

      const userId = socket.user?.id || 'anonymous';
      logger.info(`User ${userId} left workspace room: ${room} (socket: ${socket.id})`);

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
