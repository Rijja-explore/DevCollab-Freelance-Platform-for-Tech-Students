import { logger } from '../utils/logger.js';

/**
 * Global error handling middleware
 * 
 * This middleware catches all errors thrown in the application
 * and returns appropriate HTTP responses.
 * 
 * Error handling should follow this pattern:
 * - Log the error with context
 * - Return appropriate HTTP status code
 * - Include error message for client
 * - Do NOT expose sensitive information
 */

export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with context
  logger.error(`[${status}] ${message}`, {
    method: req.method,
    path: req.path,
    error: err,
  });

  // Send error response in consistent format
  const response = {
    success: false,
    message
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

/**
 * Create a custom API error
 * Usage: throw new ApiError(400, 'Invalid request');
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
