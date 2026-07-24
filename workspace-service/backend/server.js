import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import createApp from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { initializeRedis } from './src/config/redis.js';
import { validateEnvironment } from './src/config/environment.js';
import { logger } from './src/utils/logger.js';

/**
 * Server Initialization
 * 
 * This is the entry point for the backend service.
 * It orchestrates:
 * 1. Environment validation
 * 2. Database and cache connections
 * 3. HTTP server setup with Express
 * 4. Socket.io initialization (for later)
 * 5. Graceful shutdown handling
 */

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io (for later implementation)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
});

/**
 * Startup sequence
 */
const startServer = async () => {
  try {
    logger.info('🚀 Starting Workspace Service...');
    logger.info(`📍 Environment: ${NODE_ENV}`);

    validateEnvironment();

    // Connect to MongoDB
    logger.info('🗄️  Connecting to MongoDB...');
    await connectDatabase();
    logger.info('✅ MongoDB connected');

    // Connect to Redis
    logger.info('💾 Connecting to Redis...');
    const redisClient = await initializeRedis();
    logger.info('✅ Redis connected');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📊 Health check: GET http://localhost:${PORT}/health`);
    });

    // Make io available globally for socket handlers
    app.locals.io = io;

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async (signal) => {
  logger.info(`\n⏹️  ${signal} received. Shutting down gracefully...`);

  try {
    // Close server
    server.close(() => {
      logger.info('✅ HTTP server closed');
    });

    // Disconnect database
    // (Will be implemented when database connection is added)
    
    // Disconnect Redis
    // (Will be implemented when Redis connection is added)

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
startServer();

export { server, io };
