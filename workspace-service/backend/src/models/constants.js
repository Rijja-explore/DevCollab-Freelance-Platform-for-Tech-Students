/**
 * Database Model Constants
 * 
 * Centralized constants for enums and validation used across models.
 * This ensures consistency and makes updates easier.
 */

export const WORKSPACE_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

export const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM'
};

// Array versions for Mongoose enum validation
export const WORKSPACE_STATUS_VALUES = Object.values(WORKSPACE_STATUS);
export const MESSAGE_TYPE_VALUES = Object.values(MESSAGE_TYPE);

// Default values
export const DEFAULT_WORKSPACE_STATUS = WORKSPACE_STATUS.ACTIVE;
export const DEFAULT_MESSAGE_TYPE = MESSAGE_TYPE.TEXT;