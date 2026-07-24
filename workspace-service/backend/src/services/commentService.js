/**
 * Comment Service
 * 
 * Contains business logic for comment operations.
 * Handles all comment-related database interactions and business rules.
 */

import { Comment, Workspace } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Get comments for a workspace with nested replies
 */
export const getCommentsByWorkspaceId = async (workspaceId) => {
  try {
    // First verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    // Get top-level comments (no parent)
    const topLevelComments = await Comment.find({ 
      workspaceId, 
      parentId: null,
      deleted: false 
    })
    .sort({ createdAt: -1 })  // Newest first for top-level
    .populate('workspaceId', 'projectId');
    
    // For each top-level comment, get its replies
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await Comment.find({ 
          parentId: comment._id,
          deleted: false 
        })
        .sort({ createdAt: 1 });  // Oldest first for replies
        
        return {
          ...comment.toJSON(),
          replies
        };
      })
    );
    
    return { success: true, data: commentsWithReplies };
  } catch (error) {
    logger.error('Error getting comments by workspace ID:', error);
    return { success: false, message: 'Failed to retrieve comments', statusCode: 500 };
  }
};

/**
 * Create a new comment
 */
export const createComment = async (workspaceId, commentData) => {
  try {
    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    // Create comment
    const comment = new Comment({
      workspaceId,
      ...commentData
    });
    
    await comment.save();
    
    // Populate workspace info for response
    await comment.populate('workspaceId', 'projectId');
    
    return { success: true, data: comment, statusCode: 201 };
  } catch (error) {
    logger.error('Error creating comment:', error);
    return { success: false, message: 'Failed to create comment', statusCode: 500 };
  }
};

/**
 * Create a reply to an existing comment
 */
export const createReply = async (commentId, replyData) => {
  try {
    // Verify parent comment exists and is not deleted
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return { success: false, message: 'Parent comment not found', statusCode: 404 };
    }
    
    if (parentComment.deleted) {
      return { success: false, message: 'Cannot reply to deleted comment', statusCode: 400 };
    }
    
    // Use the model's addReply method
    const reply = await parentComment.addReply(replyData);
    
    // Populate workspace info for response
    await reply.populate('workspaceId', 'projectId');
    
    return { success: true, data: reply, statusCode: 201 };
  } catch (error) {
    logger.error('Error creating reply:', error);
    return { success: false, message: 'Failed to create reply', statusCode: 500 };
  }
};

/**
 * Edit a comment
 * Only the author can edit their own comment
 */
export const editComment = async (commentId, updateData, userId) => {
  try {
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return { success: false, message: 'Comment not found', statusCode: 404 };
    }
    
    if (comment.deleted) {
      return { success: false, message: 'Cannot edit deleted comment', statusCode: 400 };
    }
    
    // Authorization: Check if user is the author
    if (comment.authorId !== userId) {
      return { success: false, message: 'Forbidden: You can only edit your own comments', statusCode: 403 };
    }
    
    // Use the model's edit method
    await comment.edit(updateData.text);
    
    // Populate workspace info for response
    await comment.populate('workspaceId', 'projectId');
    
    return { success: true, data: comment };
  } catch (error) {
    logger.error('Error editing comment:', error);
    return { success: false, message: 'Failed to edit comment', statusCode: 500 };
  }
};

/**
 * Soft delete a comment
 * Only the author can delete their own comment
 */
export const deleteComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return { success: false, message: 'Comment not found', statusCode: 404 };
    }
    
    if (comment.deleted) {
      return { success: false, message: 'Comment already deleted', statusCode: 400 };
    }
    
    // Authorization: Check if user is the author
    if (comment.authorId !== userId) {
      return { success: false, message: 'Forbidden: You can only delete your own comments', statusCode: 403 };
    }
    
    // Use the model's soft delete method
    await comment.softDelete();
    
    return { success: true, message: 'Comment deleted successfully' };
  } catch (error) {
    logger.error('Error deleting comment:', error);
    return { success: false, message: 'Failed to delete comment', statusCode: 500 };
  }
};

export default {
  getCommentsByWorkspaceId,
  createComment,
  createReply,
  editComment,
  deleteComment
};