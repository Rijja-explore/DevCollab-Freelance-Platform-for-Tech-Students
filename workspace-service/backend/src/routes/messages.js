/**
 * Message Routes
 * 
 * Defines message-related API endpoints.
 * Maps routes to controllers with validation middleware.
 */

import express from 'express';
import messageController from '../controllers/messageController.js';
import { messageValidator } from '../validators/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/messages
 * Get all messages for a workspace
 * Requires authentication
 */
router.get(
  '/workspaces/:workspaceId/messages',
  authenticate,
  messageValidator.validateWorkspaceId,
  messageController.getMessages
);

/**
 * POST /api/workspaces/:workspaceId/messages
 * Create a new message
 * Requires authentication
 */
router.post(
  '/workspaces/:workspaceId/messages',
  authenticate,
  messageValidator.validateWorkspaceId,
  messageValidator.validateCreateMessage,
  messageController.createMessage
);

/**
 * PUT /api/messages/:messageId
 * Edit a message
 * Requires authentication
 */
router.put(
  '/messages/:messageId',
  authenticate,
  messageValidator.validateMessageId,
  messageValidator.validateEditMessage,
  messageController.editMessage
);

/**
 * DELETE /api/messages/:messageId
 * Soft delete a message
 * Requires authentication
 */
router.delete(
  '/messages/:messageId',
  authenticate,
  messageValidator.validateMessageId,
  messageController.deleteMessage
);

export default router;
