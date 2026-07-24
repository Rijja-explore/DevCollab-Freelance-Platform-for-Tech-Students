/**
 * Comment Request Validators
 * 
 * Validates comment-related request data.
 * Returns validation errors if data is invalid.
 */

import { 
  isValidObjectId, 
  isValidString, 
  isValidOptionalString,
  isValidNumber,
  createValidationError 
} from './commonValidator.js';

/**
 * Validate workspace ID parameter for comment routes
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
 * Validate comment ID parameter
 */
export const validateCommentId = (req, res, next) => {
  const { commentId } = req.params;
  const errors = [];
  
  if (!commentId) {
    errors.push('Comment ID is required');
  } else if (!isValidObjectId(commentId)) {
    errors.push('Invalid comment ID format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate create comment request body
 * Note: authorId is not validated here as it comes from authenticated user (req.user.id)
 */
export const validateCreateComment = (req, res, next) => {
  const { text, fileRef, lineNumber } = req.body;
  const errors = [];
  
  // Validate text (required)
  errors.push(...isValidString(text, 'text', 1, 10000));
  
  // Validate fileRef (optional)
  errors.push(...isValidOptionalString(fileRef, 'fileRef', 500));
  
  // Validate lineNumber (optional, must be positive if provided)
  if (lineNumber !== undefined && lineNumber !== null) {
    errors.push(...isValidNumber(lineNumber, 'lineNumber', 1, 1000000));
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate create reply request body
 * Note: authorId is not validated here as it comes from authenticated user (req.user.id)
 */
export const validateCreateReply = (req, res, next) => {
  const { text } = req.body;
  const errors = [];
  
  // Validate text (required)
  errors.push(...isValidString(text, 'text', 1, 10000));
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate edit comment request body
 */
export const validateEditComment = (req, res, next) => {
  const { text } = req.body;
  const errors = [];
  
  // Only text can be edited
  errors.push(...isValidString(text, 'text', 1, 10000));
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

export default {
  validateWorkspaceId,
  validateCommentId,
  validateCreateComment,
  validateCreateReply,
  validateEditComment
};