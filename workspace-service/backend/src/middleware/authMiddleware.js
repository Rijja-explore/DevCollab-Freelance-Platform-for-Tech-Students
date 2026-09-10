import jwtUtility from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches authenticated user to req.user
 * 
 * Expected token format in header:
 * Authorization: Bearer <token>
 * 
 * Sets req.user with:
 * - id: User identifier from JWT 'sub' claim
 * - role: User role from JWT 'role' claim
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is missing'
      });
    }

    // Validate Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Authorization header format must be: Bearer <token>'
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is missing'
      });
    }

    // Verify token using JWT utility
    let decoded;
    try {
      decoded = jwtUtility.verifyToken(token);
    } catch (error) {
      logger.warn(`JWT verification failed: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token'
      });
    }

    // Extract user information from JWT payload
    // Map JWT 'sub' claim to user id
    // Map JWT 'role' claim to user role
    if (!decoded.sub) {
      return res.status(401).json({
        success: false,
        message: 'Token is missing required claims'
      });
    }

    // Attach authenticated user to request
    req.user = {
      id: decoded.sub,
      role: decoded.role || 'user'
    };

    logger.debug(`User authenticated: ${req.user.id}`);

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

export { authenticate };
