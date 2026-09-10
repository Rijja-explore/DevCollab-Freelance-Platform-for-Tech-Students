/**
 * Generate JWT Token for Testing
 * 
 * This script generates valid JWT tokens for manual testing of the API.
 * Uses the private key to sign tokens (for development only).
 * 
 * Usage:
 *   node scripts/generateToken.js <userId> [role] [expiresIn]
 * 
 * Examples:
 *   node scripts/generateToken.js user123
 *   node scripts/generateToken.js user123 student
 *   node scripts/generateToken.js user123 student 2h
 */

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Error: userId is required');
  console.log('\nUsage:');
  console.log('  node scripts/generateToken.js <userId> [role] [expiresIn]');
  console.log('\nExamples:');
  console.log('  node scripts/generateToken.js user123');
  console.log('  node scripts/generateToken.js user123 student');
  console.log('  node scripts/generateToken.js user123 student 2h');
  console.log('  node scripts/generateToken.js user456 instructor 1d');
  process.exit(1);
}

const userId = args[0];
const role = args[1] || 'student';
const expiresIn = args[2] || '24h';

// Load private key
const privateKeyPath = path.resolve(__dirname, '../keys/private.pem');

let privateKey;
try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
} catch (error) {
  console.error(`Error: Could not load private key from ${privateKeyPath}`);
  console.error('Make sure you have generated RSA keys using:');
  console.error('  openssl genrsa -out keys/private.pem 2048');
  console.error('  openssl rsa -in keys/private.pem -pubout -out keys/public.pem');
  process.exit(1);
}

// Create JWT payload
const payload = {
  sub: userId,        // Subject (user ID)
  role: role,         // User role
  iat: Math.floor(Date.now() / 1000)  // Issued at
};

// Sign token
try {
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: expiresIn
  });

  console.log('\n✓ JWT Token Generated Successfully\n');
  console.log('Token Details:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`User ID:    ${userId}`);
  console.log(`Role:       ${role}`);
  console.log(`Expires In: ${expiresIn}`);
  console.log('─────────────────────────────────────────────────────');
  console.log('\nJWT Token:');
  console.log(token);
  console.log('\nUse in API requests:');
  console.log(`Authorization: Bearer ${token}`);
  console.log('\nCurl Example:');
  console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5000/api/workspaces/project/test-project`);
  console.log('');

  // Decode and display token contents (for debugging)
  const decoded = jwt.decode(token, { complete: true });
  console.log('Decoded Token (for debugging):');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('');

} catch (error) {
  console.error('Error generating token:', error.message);
  process.exit(1);
}
