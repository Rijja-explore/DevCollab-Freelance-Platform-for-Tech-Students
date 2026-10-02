import mongoose from 'mongoose';
import { Comment, Workspace } from '../models/index.js';
import { logger } from '../utils/logger.js';
import notificationClient from '../clients/notificationClient.js';

const resolveWorkspace = async (workspaceId) => {
  let workspace = null;
  if (mongoose.Types.ObjectId.isValid(workspaceId)) {
    workspace = await Workspace.findById(workspaceId);
  }
  if (!workspace) {
    workspace = await Workspace.findOne({ projectId: workspaceId });
  }
  if (!workspace) {
    throw new Error(`Workspace not found for ID: ${workspaceId}. Workspace must exist before adding comments.`);
  }
  return workspace;
};

/**
 * Get comments for a workspace with nested replies
 */
export const getCommentsByWorkspaceId = async (workspaceId) => {
  try {
    const workspace = await resolveWorkspace(workspaceId);
    
    // Get top-level comments (no parent)
    const topLevelComments = await Comment.find({ 
      workspaceId: workspace._id, 
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
    const workspace = await resolveWorkspace(workspaceId);
    
    const text = commentData.text || commentData.content || 'Code review note';
    const authorName = commentData.authorName || 'DevCollab Reviewer';

    // Create comment
    const comment = new Comment({
      workspaceId: workspace._id,
      ...commentData,
      text,
      authorName
    });
    
    await comment.save();
    
    // Populate workspace info for response
    await comment.populate('workspaceId', 'projectId');
    
    // Send notification (non-blocking)
    notificationClient.sendCommentCreated({
      workspaceId: workspaceId,
      commentId: comment._id.toString(),
      authorId: comment.authorId,
      text: comment.text,
      fileRef: comment.fileRef,
      lineNumber: comment.lineNumber,
      parentId: comment.parentId,
    }).catch(err => {
      logger.error('Failed to send comment created notification:', err);
    });
    
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
    
    // Store workspaceId for socket emission
    const workspaceId = parentComment.workspaceId.toString();
    
    // Use the model's addReply method
    const reply = await parentComment.addReply(replyData);
    
    // Populate workspace info for response
    await reply.populate('workspaceId', 'projectId');
    
    // Send notification (non-blocking)
    notificationClient.sendCommentCreated({
      workspaceId: workspaceId,
      commentId: reply._id.toString(),
      authorId: reply.authorId,
      text: reply.text,
      parentId: reply.parentId.toString(),
      isReply: true,
    }).catch(err => {
      logger.error('Failed to send reply created notification:', err);
    });
    
    return { success: true, data: reply, statusCode: 201, workspaceId };
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
    
    // Send notification (non-blocking)
    notificationClient.sendCommentUpdated({
      workspaceId: comment.workspaceId.toString(),
      commentId: comment._id.toString(),
      authorId: comment.authorId,
      text: comment.text,
      isEdited: comment.isEdited,
    }).catch(err => {
      logger.error('Failed to send comment updated notification:', err);
    });
    
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
    
    // Store workspaceId before soft delete
    const workspaceId = comment.workspaceId.toString();
    
    // Use the model's soft delete method
    await comment.softDelete();
    
    // Send notification (non-blocking)
    notificationClient.sendCommentDeleted({
      workspaceId: workspaceId,
      commentId: commentId,
      authorId: userId,
    }).catch(err => {
      logger.error('Failed to send comment deleted notification:', err);
    });
    
    return { success: true, message: 'Comment deleted successfully', workspaceId };
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