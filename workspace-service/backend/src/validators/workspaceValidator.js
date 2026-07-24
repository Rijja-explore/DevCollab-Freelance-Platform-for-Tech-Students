/**
 * Workspace Request Validators
 * 
 * Validates workspace-related request data.
 * Returns validation errors if data is invalid.
 */

import { isValidObjectId, createValidationError } from './commonValidator.js';

/**
 * Validate workspace ID parameter
 */
export const validateWorkspaceId = (req, res, next) => {
  const { id } = req.params;
  const errors = [];
  
  if (!id) {
    errors.push('Workspace ID is required');
  } else if (!isValidObjectId(id)) {
    errors.push('Invalid workspace ID format');
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

/**
 * Validate project ID parameter
 */
export const validateProjectId = (req, res, next) => {
  const { projectId } = req.params;
  const errors = [];
  
  if (!projectId) {
    errors.push('Project ID is required');
  } else if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    errors.push('Project ID must be a non-empty string');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    errors.push('Project ID must contain only letters, numbers, hyphens, and underscores');
  }
  
  if (errors.length > 0) {
    return res.status(400).json(createValidationError(errors));
  }
  
  next();
};

export default {
  validateWorkspaceId,
  validateProjectId
};