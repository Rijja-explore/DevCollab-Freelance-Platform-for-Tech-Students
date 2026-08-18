/**
 * Socket.IO Test Script
 * 
 * Tests real-time communication functionality:
 * 1. Authentication with JWT
 * 2. Joining workspace rooms
 * 3. Receiving real-time events
 * 
 * Usage:
 * 1. Start the server: npm run dev
 * 2. Generate a test token: node scripts/generateToken.js
 * 3. Run this test: node scripts/testSocketIO.js <token> <workspaceId>
 */

import { io } from 'socket.io-client';

// Parse command line arguments
const token = process.argv[2];
const workspaceId = process.argv[3];

if (!token) {
  console.error('❌ Token is required');
  console.log('Usage: node scripts/testSocketIO.js <token> <workspaceId>');
  console.log('\nGenerate token: node scripts/generateToken.js');
  process.exit(1);
}

if (!workspaceId) {
  console.error('❌ Workspace ID is required');
  console.log('Usage: node scripts/testSocketIO.js <token> <workspaceId>');
  process.exit(1);
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

console.log('🔌 Connecting to Socket.IO server...');
console.log(`📍 Server: ${SERVER_URL}`);
console.log(`🆔 Workspace: ${workspaceId}\n`);

// Create socket connection with authentication
const socket = io(SERVER_URL, {
  auth: {
    token: token
  },
  transports: ['websocket', 'polling']
});

// Connection successful
socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO server');
  console.log(`🔗 Socket ID: ${socket.id}\n`);

  // Join workspace room
  console.log(`📥 Joining workspace: ${workspaceId}...`);
  socket.emit('join-workspace', { workspaceId });
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Joined workspace successfully
socket.on('joined-workspace', (data) => {
  console.log('✅ Joined workspace successfully');
  console.log(`📍 Room: ${data.room}\n`);
  console.log('👂 Listening for real-time events...\n');
});

// Left workspace
socket.on('left-workspace', (data) => {
  console.log('👋 Left workspace');
  console.log(`📍 Room: ${data.room}\n`);
});

// Error event
socket.on('error', (error) => {
  console.error('❌ Socket error:', error.message);
});

// Message events
socket.on('message-created', (data) => {
  console.log('📨 NEW MESSAGE:');
  console.log(`   ID: ${data._id}`);
  console.log(`   Text: ${data.text}`);
  console.log(`   Sender: ${data.senderId}`);
  console.log(`   Created: ${data.createdAt}\n`);
});

socket.on('message-updated', (data) => {
  console.log('✏️  MESSAGE UPDATED:');
  console.log(`   ID: ${data._id}`);
  console.log(`   Text: ${data.text}`);
  console.log(`   Edited: ${data.isEdited}`);
  console.log(`   Updated: ${data.updatedAt}\n`);
});

socket.on('message-deleted', (data) => {
  console.log('🗑️  MESSAGE DELETED:');
  console.log(`   ID: ${data.messageId}\n`);
});

// Comment events
socket.on('comment-created', (data) => {
  console.log('💬 NEW COMMENT:');
  console.log(`   ID: ${data._id}`);
  console.log(`   Text: ${data.text}`);
  console.log(`   Author: ${data.authorId}`);
  console.log(`   Parent: ${data.parentId || 'None (top-level)'}`);
  console.log(`   Created: ${data.createdAt}\n`);
});

socket.on('comment-updated', (data) => {
  console.log('✏️  COMMENT UPDATED:');
  console.log(`   ID: ${data._id}`);
  console.log(`   Text: ${data.text}`);
  console.log(`   Edited: ${data.isEdited}`);
  console.log(`   Updated: ${data.updatedAt}\n`);
});

socket.on('comment-deleted', (data) => {
  console.log('🗑️  COMMENT DELETED:');
  console.log(`   ID: ${data.commentId}\n`);
});

// Disconnect event
socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected: ${reason}`);
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  
  // Leave workspace before disconnecting
  socket.emit('leave-workspace', { workspaceId });
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 500);
});

console.log('ℹ️  Press Ctrl+C to disconnect and exit\n');
