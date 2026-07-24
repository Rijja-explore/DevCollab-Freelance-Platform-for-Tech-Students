/**
 * Message Controller
 * 
 * Handles HTTP requests for message operations.
 * Thin layer that delegates to services and formats responses.
 */

import messageService from '../services/messageService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/workspaces/:workspaceId/messages
 * Get all messages for a workspace
 */
export const getMessages = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    logger.info(`Getting messages for workspace: ${workspaceId}`);
    
    const result = await messageService.getMessagesByWorkspaceId(workspaceId);
    
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
 * POST /api/workspaces/:workspaceId/messages
 * Create a new message
 * Uses authenticated user as sender
 */
export const createMessage = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const messageData = {
      ...req.body,
      senderId: req.user.id // Use authenticated user, not client-supplied senderId
    };
    
    logger.info(`Creating message in workspace: ${workspaceId} by user: ${req.user.id}`);
    
    const result = await messageService.createMessage(workspaceId, messageData);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/messages/:messageId
 * Edit a message
 * Passes authenticated user for authorization check
 */
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const updateData = req.body;
    const userId = req.user.id; // Pass authenticated user for authorization
    
    logger.info(`Editing message: ${messageId} by user: ${userId}`);
    
    const result = await messageService.editMessage(messageId, updateData, userId);
    
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
 * DELETE /api/messages/:messageId
 * Soft delete a message
 * Passes authenticated user for authorization check
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id; // Pass authenticated user for authorization
    
    logger.info(`Deleting message: ${messageId} by user: ${userId}`);
    
    const result = await messageService.deleteMessage(messageId, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMessages,
  createMessage,
  editMessage,
  deleteMessage
};