/**
 * Comment Routes
 * 
 * Defines comment-related API endpoints.
 * Maps routes to controllers with validation middleware.
 */

import express from 'express';
import commentController from '../controllers/commentController.js';
import { commentValidator } from '../validators/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/comments
 * Get all comments for a workspace with nested replies
 * Requires authentication
 */
router.get(
  '/workspaces/:workspaceId/comments',
  authenticate,
  commentController.getComments
);

router.get(
  '/comments/:workspaceId',
  authenticate,
  commentController.getComments
);

router.post(
  '/workspaces/:workspaceId/comments',
  authenticate,
  commentController.createComment
);

router.post(
  '/comments/:workspaceId',
  authenticate,
  commentController.createComment
);

/**
 * POST /api/comments/:commentId/reply
 * Create a reply to an existing comment
 * Requires authentication
 */
router.post(
  '/comments/:commentId/reply',
  authenticate,
  commentValidator.validateCommentId,
  commentValidator.validateCreateReply,
  commentController.createReply
);

/**
 * PUT /api/comments/:commentId
 * Edit a comment
 * Requires authentication
 */
router.put(
  '/comments/:commentId',
  authenticate,
  commentValidator.validateCommentId,
  commentValidator.validateEditComment,
  commentController.editComment
);

/**
 * DELETE /api/comments/:commentId
 * Soft delete a comment
 * Requires authentication
 */
router.delete(
  '/comments/:commentId',
  authenticate,
  commentValidator.validateCommentId,
  commentController.deleteComment
);

export default router;
