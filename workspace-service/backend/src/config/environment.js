import { logger } from '../utils/logger.js';

/**
 * Environment Configuration Loader
 * 
 * Validates required environment variables at startup.
 * This ensures the application fails fast if critical config is missing.
 */

const REQUIRED_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'REDIS_URL',
];

const OPTIONAL_ENV_VARS = {
  CORS_ORIGIN: '*',
  LOG_LEVEL: 'info',
  JWT_PUBLIC_KEY_URL: null,
  RABBITMQ_URL: null,
};

/**
 * Validate environment configuration
 * Call this at startup to ensure all required variables are set
 */
export const validateEnvironment = () => {
  const missing = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    logger.error(
      `❌ Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error('📋 See .env.example for configuration template');
    process.exit(1);
  }

  logger.info('✅ Environment configuration validated');
};

/**
 * Get environment configuration object
 * Useful for accessing config in services
 */
export const getConfig = () => {
  return {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
    REDIS_URL: process.env.REDIS_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN || OPTIONAL_ENV_VARS.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL || OPTIONAL_ENV_VARS.LOG_LEVEL,
    JWT_PUBLIC_KEY_URL: process.env.JWT_PUBLIC_KEY_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
  };
};
