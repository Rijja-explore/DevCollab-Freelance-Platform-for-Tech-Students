import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

class JWTUtility {
  constructor() {
    this.publicKey = null;
    this.algorithm = process.env.JWT_ALGORITHM || 'RS256';
  }

  /**
   * Load the public key from file system
   * This method reads the public key once and caches it
   */
  loadPublicKey() {
    if (this.publicKey) {
      return this.publicKey;
    }

    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;
    
    if (!publicKeyPath) {
      throw new Error('JWT_PUBLIC_KEY_PATH environment variable is not set');
    }

    const absolutePath = path.resolve(process.cwd(), publicKeyPath);

    try {
      this.publicKey = fs.readFileSync(absolutePath, 'utf8');
      return this.publicKey;
    } catch (error) {
      throw new Error(`Failed to load public key from ${absolutePath}: ${error.message}`);
    }
  }

  /**
   * Verify and decode a JWT token
   * @param {string} token - The JWT token to verify
   * @returns {Object} - The decoded token payload
   * @throws {Error} - If token is invalid, expired, or verification fails
   */
  verifyToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    const publicKey = this.loadPublicKey();

    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: [this.algorithm]
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not yet valid');
      } else {
        throw new Error(`Token verification failed: ${error.message}`);
      }
    }
  }

  /**
   * Decode token payload without verification (for debugging only)
   * WARNING: Never use this for authentication - always use verifyToken
   * @param {string} token - The JWT token to decode
   * @returns {Object} - The decoded token payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }
}

// Export singleton instance
export default new JWTUtility();
