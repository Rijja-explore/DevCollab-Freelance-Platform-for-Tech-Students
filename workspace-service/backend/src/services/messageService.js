/**
 * Message Service
 * 
 * Contains business logic for message operations.
 * Handles all message-related database interactions and business rules.
 */

import { Message, Workspace } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Get all messages for a workspace
 */
export const getMessagesByWorkspaceId = async (workspaceId) => {
  try {
    // First verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    // Get non-deleted messages, sorted oldest to newest
    const messages = await Message.find({ 
      workspaceId, 
      deleted: false 
    })
    .sort({ createdAt: 1 })  // Oldest first
    .populate('workspaceId', 'projectId');
    
    return { success: true, data: messages };
  } catch (error) {
    logger.error('Error getting messages by workspace ID:', error);
    return { success: false, message: 'Failed to retrieve messages', statusCode: 500 };
  }
};

/**
 * Create a new message
 */
export const createMessage = async (workspaceId, messageData) => {
  try {
    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    // Create message
    const message = new Message({
      workspaceId,
      ...messageData
    });
    
    await message.save();
    
    // Populate workspace info for response
    await message.populate('workspaceId', 'projectId');
    
    return { success: true, data: message, statusCode: 201 };
  } catch (error) {
    logger.error('Error creating message:', error);
    return { success: false, message: 'Failed to create message', statusCode: 500 };
  }
};

/**
 * Edit a message
 * Only the author can edit their own message
 */
export const editMessage = async (messageId, updateData, userId) => {
  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      return { success: false, message: 'Message not found', statusCode: 404 };
    }
    
    if (message.deleted) {
      return { success: false, message: 'Cannot edit deleted message', statusCode: 400 };
    }
    
    // Authorization: Check if user is the author
    if (message.senderId !== userId) {
      return { success: false, message: 'Forbidden: You can only edit your own messages', statusCode: 403 };
    }
    
    // Use the model's edit method
    await message.edit(updateData.text);
    
    // Populate workspace info for response
    await message.populate('workspaceId', 'projectId');
    
    return { success: true, data: message };
  } catch (error) {
    logger.error('Error editing message:', error);
    return { success: false, message: 'Failed to edit message', statusCode: 500 };
  }
};

/**
 * Soft delete a message
 * Only the author can delete their own message
 */
export const deleteMessage = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      return { success: false, message: 'Message not found', statusCode: 404 };
    }
    
    if (message.deleted) {
      return { success: false, message: 'Message already deleted', statusCode: 400 };
    }
    
    // Authorization: Check if user is the author
    if (message.senderId !== userId) {
      return { success: false, message: 'Forbidden: You can only delete your own messages', statusCode: 403 };
    }
    
    // Use the model's soft delete method
    await message.softDelete();
    
    return { success: true, message: 'Message deleted successfully' };
  } catch (error) {
    logger.error('Error deleting message:', error);
    return { success: false, message: 'Failed to delete message', statusCode: 500 };
  }
};

export default {
  getMessagesByWorkspaceId,
  createMessage,
  editMessage,
  deleteMessage
};