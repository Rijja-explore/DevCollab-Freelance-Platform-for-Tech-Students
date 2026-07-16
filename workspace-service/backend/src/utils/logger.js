/**
 * Logger utility
 * 
 * Provides consistent logging across the application.
 * In production, this can be extended to use Winston, Pino, or similar.
 * 
 * Usage:
 * logger.info('Message');
 * logger.warn('Warning');
 * logger.error('Error', error);
 * logger.debug('Debug info');
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const colorize = (level, message) => {
  const colors = {
    debug: '\x1b[36m',   // cyan
    info: '\x1b[32m',    // green
    warn: '\x1b[33m',    // yellow
    error: '\x1b[31m',   // red
    reset: '\x1b[0m',
  };

  return `${colors[level]}[${level.toUpperCase()}]${colors.reset} ${message}`;
};

export const logger = {
  debug: (message, data = null) => {
    if (LOG_LEVELS.debug >= CURRENT_LEVEL) {
      console.log(colorize('debug', message), data || '');
    }
  },

  info: (message, data = null) => {
    if (LOG_LEVELS.info >= CURRENT_LEVEL) {
      console.log(colorize('info', message), data || '');
    }
  },

  warn: (message, data = null) => {
    if (LOG_LEVELS.warn >= CURRENT_LEVEL) {
      console.warn(colorize('warn', message), data || '');
    }
  },

  error: (message, error = null) => {
    if (LOG_LEVELS.error >= CURRENT_LEVEL) {
      console.error(colorize('error', message), error || '');
    }
  },
};
