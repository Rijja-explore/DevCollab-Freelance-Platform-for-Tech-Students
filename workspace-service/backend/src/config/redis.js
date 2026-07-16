import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

/**
 * Redis Cache Connection
 * 
 * Exports functions that handle:
 * - Connection string validation
 * - Connection establishment
 * - Error handling
 * 
 * This connection is established once in server.js and reused throughout the app.
 * Do NOT create new connections in routes or services.
 */

let redisClient = null;

export const initializeRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    // Create Redis client
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max retries reached');
          }
          return retries * 50;
        },
      },
    });

    // Event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis: Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis: Ready to accept commands');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis: Reconnecting...');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test connection with PING
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      logger.info('Redis: PING successful');
    }

    return redisClient;

  } catch (error) {
    logger.error('Failed to initialize Redis:', error.message);
    throw error;
  }
};

/**
 * Get the Redis client instance
 * Use this to access Redis in services
 */
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis first.');
  }
  return redisClient;
};

/**
 * Disconnect from Redis
 * Call this during graceful shutdown
 */
export const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};
