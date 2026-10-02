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
import messageService from '../services/messageService.js';
import commentService from '../services/commentService.js';

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
  socket.on('send-message', async (msgPayload) => {
    try {
      const workspaceId = msgPayload?.workspaceId;
      if (workspaceId) {
        let payloadToEmit = { ...msgPayload };
        const text = msgPayload.text || msgPayload.content;

        // If this message was not yet saved to MongoDB via HTTP POST, persist it now
        if (!msgPayload._id && !msgPayload.id && text) {
          try {
            const senderId = socket.user?.id || msgPayload.senderId || 'user';
            const saved = await messageService.createMessage(workspaceId, {
              text,
              content: text,
              senderId,
              senderName: msgPayload.senderName || 'Member'
            });
            if (saved.success && saved.data) {
              payloadToEmit = saved.data.toJSON ? saved.data.toJSON() : saved.data;
              payloadToEmit.workspaceId = workspaceId;
              payloadToEmit.content = text;
              payloadToEmit.text = text;
            }
          } catch (dbErr) {
            logger.warn(`Could not persist socket message to DB: ${dbErr.message}`);
          }
        }

        const room = socketEmitter.getWorkspaceRoom(workspaceId);
        socket.to(room).emit('new-message', payloadToEmit);
        socket.to(room).emit('message-created', payloadToEmit);
        socket.emit('new-message', payloadToEmit);
        socket.emit('message-created', payloadToEmit);
        socket.emit('message-sent', { success: true, payload: payloadToEmit });
      }
    } catch (error) {
      logger.error(`Error broadcasting socket message: ${error.message}`);
      socket.emit('error', { message: 'Failed to broadcast message' });
    }
  });

  /**
   * Real-time client-to-room code comment broadcast
   */
  socket.on('send-comment', async (cmtPayload) => {
    try {
      const workspaceId = cmtPayload?.workspaceId;
      if (workspaceId) {
        let payloadToEmit = { ...cmtPayload };
        const text = cmtPayload.text || cmtPayload.content;

        // If this comment was not yet saved to MongoDB via HTTP POST, persist it now
        if (!cmtPayload._id && !cmtPayload.id && text) {
          try {
            const authorId = socket.user?.id || cmtPayload.authorId || 'user';
            const saved = await commentService.createComment(workspaceId, {
              text,
              content: text,
              authorId,
              lineNumber: cmtPayload.lineNumber,
              fileRef: cmtPayload.fileSnippet || cmtPayload.fileRef
            });
            if (saved.success && saved.data) {
              payloadToEmit = saved.data.toJSON ? saved.data.toJSON() : saved.data;
              payloadToEmit.workspaceId = workspaceId;
              payloadToEmit.content = text;
              payloadToEmit.text = text;
            }
          } catch (dbErr) {
            logger.warn(`Could not persist socket comment to DB: ${dbErr.message}`);
          }
        }

        const room = socketEmitter.getWorkspaceRoom(workspaceId);
        socket.to(room).emit('new-comment', payloadToEmit);
        socket.to(room).emit('comment-created', payloadToEmit);
        socket.emit('new-comment', payloadToEmit);
        socket.emit('comment-created', payloadToEmit);
        socket.emit('comment-sent', { success: true, payload: payloadToEmit });
      }
    } catch (error) {
      logger.error(`Error broadcasting socket comment: ${error.message}`);
      socket.emit('error', { message: 'Failed to broadcast comment' });
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
    logger.info(`User ${socket.user?.id || 'anonymous'} disconnected (socket: ${socket.id}): ${reason}`);
  });
};

export default handleWorkspaceSocket;
