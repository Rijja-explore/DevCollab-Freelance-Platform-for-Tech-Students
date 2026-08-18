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
  'JWT_PUBLIC_KEY_PATH',
  // RabbitMQ — required from Phase 8 onwards
  'RABBITMQ_HOST',
  'RABBITMQ_PORT',
  'RABBITMQ_USERNAME',
  'RABBITMQ_PASSWORD',
  'RABBITMQ_EXCHANGE',
];

/**
 * Validate environment configuration.
 * Call this at startup to ensure all required variables are set.
 */
export const validateEnvironment = () => {
  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    logger.error('📋 See .env.example for configuration template');
    process.exit(1);
  }

  logger.info('✅ Environment configuration validated');
};

/**
 * Get full environment configuration object.
 * Useful for accessing config in services without re-reading process.env.
 */
export const getConfig = () => ({
  PORT:     process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,

  // Database
  MONGO_URI:    process.env.MONGO_URI,
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'workspace-service',

  // Cache
  REDIS_URL: process.env.REDIS_URL,
  REDIS_DB:  process.env.REDIS_DB || '0',

  // CORS / Logging
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  LOG_LEVEL:   process.env.LOG_LEVEL   || 'info',

  // JWT
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH,
  JWT_ALGORITHM:       process.env.JWT_ALGORITHM || 'RS256',

  // RabbitMQ
  RABBITMQ_HOST:     process.env.RABBITMQ_HOST     || 'localhost',
  RABBITMQ_PORT:     parseInt(process.env.RABBITMQ_PORT || '5672', 10),
  RABBITMQ_USERNAME: process.env.RABBITMQ_USERNAME || 'guest',
  RABBITMQ_PASSWORD: process.env.RABBITMQ_PASSWORD || 'guest',
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE || 'devcollab.events',

  // External HTTP services (Phase 6 — still used by mock clients)
  AUTH_SERVICE_URL:              process.env.AUTH_SERVICE_URL              || 'http://localhost:3001',
  AUTH_SERVICE_ENABLED:          process.env.AUTH_SERVICE_ENABLED          === 'true',
  NOTIFICATION_SERVICE_URL:      process.env.NOTIFICATION_SERVICE_URL      || 'http://localhost:3002',
  NOTIFICATION_SERVICE_ENABLED:  process.env.NOTIFICATION_SERVICE_ENABLED  === 'true',
  SERVICE_TIMEOUT:               parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
});
