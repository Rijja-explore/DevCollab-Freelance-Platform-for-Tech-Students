/**
 * Socket.IO Authentication Middleware
 * 
 * Authenticates Socket.IO connections using JWT tokens.
 * Reuses the existing JWT utility from Phase 4.
 * 
 * Token can be provided via:
 * 1. auth.token in socket handshake
 * 2. Authorization header
 * 
 * After successful authentication, socket.user contains:
 * - id: User identifier from JWT 'sub' claim
 * - role: User role from JWT 'role' claim
 */

import jwtUtility from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user to socket
 */
export const socketAuthenticate = (socket, next) => {
  try {
    // Extract token from auth or headers
    let token = socket.handshake.auth?.token;
    
    // Fallback to Authorization header
    if (!token) {
      const authHeader = socket.handshake.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      logger.warn(`Socket connection rejected: No token provided`);
      return next(new Error('Authentication token is required'));
    }

    // Verify token using existing JWT utility
    let decoded;
    try {
      decoded = jwtUtility.verifyToken(token);
    } catch (error) {
      logger.warn(`Socket authentication failed: ${error.message}`);
      return next(new Error(error.message || 'Invalid or expired token'));
    }

    // Extract user information from JWT payload
    if (!decoded.sub) {
      logger.warn(`Socket connection rejected: Token missing required claims`);
      return next(new Error('Token is missing required claims'));
    }

    // Attach authenticated user to socket
    socket.user = {
      id: decoded.sub,
      role: decoded.role || 'user'
    };

    logger.info(`Socket authenticated: ${socket.user.id} (${socket.id})`);

    // Continue to connection
    next();
  } catch (error) {
    logger.error(`Socket authentication error: ${error.message}`);
    return next(new Error('Authentication failed'));
  }
};

export default socketAuthenticate;
