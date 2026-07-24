/**
 * Message Request Validators
 * 
 * Validates message-related request data.
 * Returns validation errors if data is invalid.
 */

import { 
  isValidObjectId, 
  isValidString, 
  isValidEnum, 
  createValidationError 
} from './commonValidator.js';
import { MESSAGE_TYPE_VALUES } from '../models/constants.js';

/**
 * Validate workspace ID parameter for message routes
 */
export const validateWorkspaceId = (req, res, next) => {
  const { workspaceId } = req.params;
  const errors = [];
  
  if (!workspaceId) {
    errors.push('Workspace ID is required');
  } else if (!isValidObjectId(workspaceId)) {
    errors.push('Invalid workspace ID format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate message ID parameter
 */
export const validateMessageId = (req, res, next) => {
  const { messageId } = req.params;
  const errors = [];
  
  if (!messageId) {
    errors.push('Message ID is required');
  } else if (!isValidObjectId(messageId)) {
    errors.push('Invalid message ID format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate create message request body
 * Note: senderId is not validated here as it comes from authenticated user (req.user.id)
 */
export const validateCreateMessage = (req, res, next) => {
  const { text, type } = req.body;
  const errors = [];
  
  // Validate text
  errors.push(...isValidString(text, 'text', 1, 5000));
  
  // Validate type (optional, has default)
  if (type) {
    errors.push(...isValidEnum(type, 'type', MESSAGE_TYPE_VALUES));
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate edit message request body
 */
export const validateEditMessage = (req, res, next) => {
  const { text } = req.body;
  const errors = [];
  
  // Only text can be edited
  errors.push(...isValidString(text, 'text', 1, 5000));
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

export default {
  validateWorkspaceId,
  validateMessageId,
  validateCreateMessage,
  validateEditMessage
};