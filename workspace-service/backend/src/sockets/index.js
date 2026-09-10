/**
 * Socket.IO Initialization
 * 
 * Configures Socket.IO server with authentication and event handlers.
 * Integrates with existing Express server and JWT authentication.
 */

import { socketAuthenticate } from '../middleware/socketAuthMiddleware.js';
import { handleWorkspaceSocket } from './workspaceSocket.js';
import socketEmitter from '../utils/socketEmitter.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize Socket.IO with authentication and handlers
 * @param {Server} io - Socket.IO server instance
 */
export const initializeSocket = (io) => {
  logger.info('🔌 Initializing Socket.IO...');

  // Initialize socket emitter with io instance
  socketEmitter.initialize(io);

  // Apply authentication middleware
  io.use(socketAuthenticate);

  // Handle new socket connections
  io.on('connection', (socket) => {
    logger.info(`✅ Socket connected: ${socket.id} (User: ${socket.user.id})`);

    // Setup workspace event handlers
    handleWorkspaceSocket(socket);

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket error (${socket.id}): ${error.message}`);
    });
  });

  logger.info('✅ Socket.IO initialized successfully');
};

export default initializeSocket;
