/**
 * External Services Configuration
 * 
 * Configuration for integration with external microservices.
 * Currently uses mock implementations until services are ready.
 * 
 * When Person A (Auth Service) and Person C (Notification Service) complete their work,
 * only the client implementations need to be updated - this config remains the same.
 */

import { logger } from '../utils/logger.js';

/**
 * Service configuration object
 * Values loaded from environment variables
 */
export const servicesConfig = {
  auth: {
    baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
    enabled: process.env.AUTH_SERVICE_ENABLED === 'true',
  },
  notification: {
    baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
    enabled: process.env.NOTIFICATION_SERVICE_ENABLED === 'true',
  },
};

/**
 * Check if a service is configured and enabled
 * @param {string} serviceName - Name of the service (auth, notification)
 * @returns {boolean} - True if service is enabled
 */
export const isServiceEnabled = (serviceName) => {
  const service = servicesConfig[serviceName];
  if (!service) {
    logger.warn(`Unknown service: ${serviceName}`);
    return false;
  }
  return service.enabled;
};

/**
 * Get service configuration
 * @param {string} serviceName - Name of the service
 * @returns {Object} - Service configuration object
 */
export const getServiceConfig = (serviceName) => {
  const service = servicesConfig[serviceName];
  if (!service) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  return service;
};

/**
 * Log service configuration on startup
 */
export const logServiceConfiguration = () => {
  logger.info('📡 External Services Configuration:');
  
  Object.entries(servicesConfig).forEach(([name, config]) => {
    const status = config.enabled ? '✅ Enabled' : '⚠️  Disabled (using mocks)';
    logger.info(`   ${name}: ${status} - ${config.baseUrl}`);
  });
};

export default servicesConfig;
