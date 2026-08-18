/**
 * Comment Controller
 * 
 * Handles HTTP requests for comment operations.
 * Thin layer that delegates to services and formats responses.
 * Emits real-time events after successful operations.
 */

import commentService from '../services/commentService.js';
import socketEmitter from '../utils/socketEmitter.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/workspaces/:workspaceId/comments
 * Get all comments for a workspace with nested replies
 */
export const getComments = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    logger.info(`Getting comments for workspace: ${workspaceId}`);
    
    const result = await commentService.getCommentsByWorkspaceId(workspaceId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/workspaces/:workspaceId/comments
 * Create a new comment
 * Uses authenticated user as author
 */
export const createComment = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const commentData = {
      ...req.body,
      authorId: req.user.id // Use authenticated user, not client-supplied authorId
    };
    
    logger.info(`Creating comment in workspace: ${workspaceId} by user: ${req.user.id}`);
    
    const result = await commentService.createComment(workspaceId, commentData);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    // Emit real-time event after successful creation
    socketEmitter.emitCommentCreated(workspaceId, result.data);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/comments/:commentId/reply
 * Create a reply to an existing comment
 * Uses authenticated user as author
 */
export const createReply = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const replyData = {
      ...req.body,
      authorId: req.user.id // Use authenticated user, not client-supplied authorId
    };
    
    logger.info(`Creating reply to comment: ${commentId} by user: ${req.user.id}`);
    
    const result = await commentService.createReply(commentId, replyData);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    // Emit real-time event after successful reply creation
    // workspaceId is included in the result for socket emission
    socketEmitter.emitCommentCreated(result.workspaceId, result.data);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/comments/:commentId
 * Edit a comment
 * Passes authenticated user for authorization check
 */
export const editComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const updateData = req.body;
    const userId = req.user.id; // Pass authenticated user for authorization
    
    logger.info(`Editing comment: ${commentId} by user: ${userId}`);
    
    const result = await commentService.editComment(commentId, updateData, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    // Emit real-time event after successful update
    socketEmitter.emitCommentUpdated(result.data.workspaceId.toString(), result.data);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/comments/:commentId
 * Soft delete a comment
 * Passes authenticated user for authorization check
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id; // Pass authenticated user for authorization
    
    logger.info(`Deleting comment: ${commentId} by user: ${userId}`);
    
    const result = await commentService.deleteComment(commentId, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    // Emit real-time event after successful deletion
    // workspaceId is included in the result for socket emission
    socketEmitter.emitCommentDeleted(result.workspaceId, commentId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getComments,
  createComment,
  createReply,
  editComment,
  deleteComment
};