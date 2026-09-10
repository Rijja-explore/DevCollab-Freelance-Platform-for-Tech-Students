import { logger } from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs incoming HTTP requests with method, path, and response time
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Hook into response finish to log timing
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
};
