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
  messageController.getMessages
);

router.get(
  '/messages/:workspaceId',
  authenticate,
  messageController.getMessages
);

router.post(
  '/workspaces/:workspaceId/messages',
  authenticate,
  messageController.createMessage
);

router.post(
  '/messages/:workspaceId',
  authenticate,
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
