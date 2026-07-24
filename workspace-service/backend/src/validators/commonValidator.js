/**
 * Common Validation Utilities
 * 
 * Reusable validation functions used across different validators.
 * Contains utilities for validating common data types and formats.
 */

import mongoose from 'mongoose';

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate required string field
 */
export const isValidString = (value, fieldName, minLength = 1, maxLength = null) => {
  const errors = [];
  
  if (!value) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return errors;
  }
  
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push(`${fieldName} cannot be empty`);
    return errors;
  }
  
  if (trimmed.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (maxLength && trimmed.length > maxLength) {
    errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  
  return errors;
};

/**
 * Validate optional string field
 */
export const isValidOptionalString = (value, fieldName, maxLength = null) => {
  const errors = [];
  
  // If not provided, it's valid (optional)
  if (!value) {
    return errors;
  }
  
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return errors;
  }
  
  if (maxLength && value.trim().length > maxLength) {
    errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
  }
  
  return errors;
};

/**
 * Validate number field
 */
export const isValidNumber = (value, fieldName, min = null, max = null) => {
  const errors = [];
  
  if (value === null || value === undefined) {
    return errors; // Optional by default
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    errors.push(`${fieldName} must be a valid number`);
    return errors;
  }
  
  if (min !== null && num < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (max !== null && num > max) {
    errors.push(`${fieldName} cannot exceed ${max}`);
  }
  
  return errors;
};

/**
 * Validate enum field
 */
export const isValidEnum = (value, fieldName, allowedValues) => {
  const errors = [];
  
  if (!value) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  if (!allowedValues.includes(value)) {
    errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  
  return errors;
};

/**
 * Create validation error response
 */
export const createValidationError = (errors) => {
  return {
    success: false,
    message: 'Validation failed',
    errors: errors
  };
};

export default {
  isValidObjectId,
  isValidString,
  isValidOptionalString,
  isValidNumber,
  isValidEnum,
  createValidationError
};