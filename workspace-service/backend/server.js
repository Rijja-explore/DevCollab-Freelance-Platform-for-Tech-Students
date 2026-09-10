import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import createApp from './src/app.js';
import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import { initializeRedis, disconnectRedis } from './src/config/redis.js';
import { validateEnvironment } from './src/config/environment.js';
import { logServiceConfiguration } from './src/config/services.js';
import { logger } from './src/utils/logger.js';
import { initializeSocket } from './src/sockets/index.js';
import { connectRabbitMQ, disconnectRabbitMQ } from './src/messaging/rabbitmq.js';
import { startConsumers } from './src/messaging/consumer.js';

/**
 * Server Initialization
 *
 * Startup sequence:
 *  1. Validate environment variables (fast-fail on missing config)
 *  2. Connect MongoDB
 *  3. Connect Redis
 *  4. Connect RabbitMQ + start consumers
 *  5. Start HTTP server + Socket.IO
 */

const PORT     = process.env.PORT     || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app    = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
});

// ── Startup ───────────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    logger.info('🚀 Starting Workspace Service...');
    logger.info(`📍 Environment: ${NODE_ENV}`);

    // 1. Validate env
    validateEnvironment();

    // Log external service config
    logServiceConfiguration();

    // 2. MongoDB
    logger.info('🗄️  Connecting to MongoDB...');
    await connectDatabase();
    logger.info('✅ MongoDB connected');

    // 3. Redis
    logger.info('💾 Connecting to Redis...');
    await initializeRedis();
    logger.info('✅ Redis connected');

    // 4. RabbitMQ
    logger.info('🐇 Connecting to RabbitMQ...');
    await connectRabbitMQ();
    logger.info('✅ RabbitMQ connected');

    logger.info('📨 Starting RabbitMQ consumers...');
    await startConsumers();
    logger.info('✅ RabbitMQ consumers started');

    // 5. Socket.IO
    logger.info('🔌 Setting up Socket.IO...');
    initializeSocket(io);

    // Make io available to any request handler that needs it
    app.locals.io = io;

    // 6. HTTP server
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📊 Health check: GET http://localhost:${PORT}/health`);
      logger.info(`🔌 Socket.IO ready for connections`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────

const shutdown = async (signal) => {
  logger.info(`\n⏹️  ${signal} received. Shutting down gracefully...`);
  try {
    server.close(() => logger.info('✅ HTTP server closed'));

    await disconnectRabbitMQ();
    await disconnectDatabase();
    await disconnectRedis();

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

startServer();

export { server, io };
