/**
 * Milestone Request Validators
 */

import {
  isValidObjectId,
  isValidString,
  isValidNumber,
  createValidationError,
} from './commonValidator.js';

export const validateWorkspaceIdParam = (req, res, next) => {
  const { workspaceId } = req.params;
  const errors = [];
  if (!workspaceId)                      errors.push('Workspace ID is required');
  else if (!isValidObjectId(workspaceId)) errors.push('Invalid workspace ID format');
  if (errors.length) return res.status(400).json(createValidationError(errors));
  next();
};

export const validateMilestoneIdParam = (req, res, next) => {
  const { milestoneId } = req.params;
  const errors = [];
  if (!milestoneId)                       errors.push('Milestone ID is required');
  else if (!isValidObjectId(milestoneId)) errors.push('Invalid milestone ID format');
  if (errors.length) return res.status(400).json(createValidationError(errors));
  next();
};

export const validateCreateMilestone = (req, res, next) => {
  const { contractId, title, amount } = req.body || {};
  const errors = [
    ...isValidString(contractId, 'contractId', 1, 100),
    ...isValidString(title,      'title',      1, 200),
    ...isValidNumber(amount,     'amount',     0),
  ];
  if (amount === undefined || amount === null) errors.push('amount is required');
  if (errors.length) return res.status(400).json(createValidationError(errors));
  next();
};

export const validateCompleteMilestone = (req, res, next) => {
  const { completionNotes } = req.body || {};
  const errors = [];
  if (completionNotes !== undefined && completionNotes !== null) {
    if (typeof completionNotes !== 'string') {
      errors.push('completionNotes must be a string');
    } else if (completionNotes.length > 2000) {
      errors.push('completionNotes cannot exceed 2000 characters');
    }
  }
  if (errors.length) return res.status(400).json(createValidationError(errors));
  next();
};

export default {
  validateWorkspaceIdParam,
  validateMilestoneIdParam,
  validateCreateMilestone,
  validateCompleteMilestone,
};
