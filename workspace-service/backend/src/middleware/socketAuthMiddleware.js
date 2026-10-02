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
 * - tokenExpiry: Token expiration timestamp
 * 
 * Handles:
 * - Token expiration detection
 * - Graceful disconnection on expired tokens
 * - Reconnection retry signals for client
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
      logger.warn(`Socket connection rejected (${socket.id}): No token provided`);
      return next(new Error('Authentication token is required'));
    }

    // Verify token using existing JWT utility
    let decoded;
    try {
      decoded = jwtUtility.verifyToken(token);
    } catch (error) {
      logger.warn(`Socket authentication failed (${socket.id}): ${error.message}`);
      
      // Provide specific error message for expired tokens
      if (error.message?.includes('expired') || error.name === 'TokenExpiredError') {
        logger.info(`Socket connection rejected (${socket.id}): Token expired at ${error.expiredAt}`);
        return next(new Error('Token expired - please refresh and reconnect'));
      }
      
      return next(new Error(error.message || 'Invalid or expired token'));
    }

    // Extract user information from JWT payload
    if (!decoded.sub) {
      logger.warn(`Socket connection rejected (${socket.id}): Token missing required claims`);
      return next(new Error('Token is missing required claims'));
    }

    // Calculate token expiry for client-side refresh decisions
    const tokenExpiry = decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = tokenExpiry ? (tokenExpiry - now) / 1000 : null; // In seconds

    if (timeUntilExpiry && timeUntilExpiry < 60) {
      logger.warn(`Socket connection accepted but token expiring soon (${socket.id}): ${timeUntilExpiry}s remaining`);
    }

    // Attach authenticated user to socket
    socket.user = {
      id: decoded.sub,
      role: decoded.role || 'user',
      tokenExpiry: tokenExpiry,
      timeUntilExpiry: timeUntilExpiry
    };

    logger.info(`Socket authenticated (${socket.id}): ${socket.user.id} (${socket.user.role}) - token valid for ${timeUntilExpiry || 'unknown'} seconds`);

    // Continue to connection
    next();
  } catch (error) {
    logger.error(`Socket authentication error (${socket.id}): ${error.message}`);
    return next(new Error('Authentication failed'));
  }
};

export default socketAuthenticate;
