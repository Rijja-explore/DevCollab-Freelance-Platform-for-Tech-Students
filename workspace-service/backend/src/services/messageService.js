import mongoose from 'mongoose';
import { Message, Workspace } from '../models/index.js';
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
    workspace = new Workspace({
      projectId: workspaceId,
      startupId: 'startup-owner-1',
      studentId: 'student-user-1',
      title: `Workspace for Project ${workspaceId.slice(0, 8)}`,
      status: 'ACTIVE'
    });
    await workspace.save();
  }
  return workspace;
};

/**
 * Get all messages for a workspace
 */
export const getMessagesByWorkspaceId = async (workspaceId) => {
  try {
    const workspace = await resolveWorkspace(workspaceId);
    
    // Get non-deleted messages, sorted oldest to newest
    const messages = await Message.find({ 
      workspaceId: workspace._id, 
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
    const workspace = await resolveWorkspace(workspaceId);
    
    const text = messageData.text || messageData.content || 'Message';

    // Create message
    const message = new Message({
      workspaceId: workspace._id,
      ...messageData,
      text
    });
    
    await message.save();
    
    // Populate workspace info for response
    await message.populate('workspaceId', 'projectId');
    
    // Send notification (non-blocking)
    notificationClient.sendMessageCreated({
      workspaceId: workspaceId,
      messageId: message._id.toString(),
      senderId: message.senderId,
      text: message.text,
      type: message.type,
    }).catch(err => {
      logger.error('Failed to send message created notification:', err);
      // Don't fail the request if notification fails
    });
    
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
    
    // Send notification (non-blocking)
    notificationClient.sendMessageUpdated({
      workspaceId: message.workspaceId.toString(),
      messageId: message._id.toString(),
      senderId: message.senderId,
      text: message.text,
      isEdited: message.isEdited,
    }).catch(err => {
      logger.error('Failed to send message updated notification:', err);
    });
    
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
    
    // Store workspaceId before soft delete
    const workspaceId = message.workspaceId.toString();
    
    // Use the model's soft delete method
    await message.softDelete();
    
    // Send notification (non-blocking)
    notificationClient.sendMessageDeleted({
      workspaceId: workspaceId,
      messageId: messageId,
      senderId: userId,
    }).catch(err => {
      logger.error('Failed to send message deleted notification:', err);
    });
    
    return { success: true, message: 'Message deleted successfully', workspaceId };
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