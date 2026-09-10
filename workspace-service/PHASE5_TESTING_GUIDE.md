# Phase 5 Testing Guide

## Complete Step-by-Step Testing Instructions

This guide walks you through testing the Socket.IO implementation end-to-end.

---

## Prerequisites

- Node.js 18+ installed
- MongoDB running
- Redis running
- Backend dependencies installed (`npm install`)

---

## Step 1: Start the Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
🚀 Starting Workspace Service...
📍 Environment: development
🗄️  Connecting to MongoDB...
✅ MongoDB connected
💾 Connecting to Redis...
✅ Redis connected
🔌 Setting up Socket.IO...
🔌 Initializing Socket.IO...
Socket emitter initialized
✅ Socket.IO initialized successfully
✅ Server running on port 5000
📊 Health check: GET http://localhost:5000/health
🔌 Socket.IO ready for connections
```

If you see all these checkmarks, Socket.IO is ready! ✅

---

## Step 2: Generate Authentication Token

In a new terminal:

```bash
cd backend
node scripts/generateToken.js
```

**Expected output:**
```
✅ JWT Token Generated Successfully

🔑 Token:
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

📋 Token Details:
{
  sub: 'user-test-001',
  role: 'user',
  iat: 1234567890,
  exp: 1234654290
}

⏰ Token valid for: 24 hours
```

**Copy the token** - you'll need it for testing!

---

## Step 3: Create a Test Workspace

Using the token from Step 2:

```bash
curl -X POST http://localhost:5000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{\"projectId\": \"test-project-socket\"}"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123def456789012",
    "projectId": "test-project-socket",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Copy the `_id`** - this is your workspace ID!

---

## Step 4: Test Socket.IO Connection

Open a new terminal and run:

```bash
cd backend
node scripts/testSocketIO.js YOUR_TOKEN WORKSPACE_ID
```

Replace:
- `YOUR_TOKEN` with token from Step 2
- `WORKSPACE_ID` with _id from Step 3

**Expected output:**
```
🔌 Connecting to Socket.IO server...
📍 Server: http://localhost:5000
🆔 Workspace: 65abc123def456789012

✅ Connected to Socket.IO server
🔗 Socket ID: abc123xyz789

📥 Joining workspace: 65abc123def456789012...
✅ Joined workspace successfully
📍 Room: workspace_65abc123def456789012

👂 Listening for real-time events...

ℹ️  Press Ctrl+C to disconnect and exit
```

✅ **Socket.IO connection successful!**

Leave this terminal open - it will show real-time events.

---

## Step 5: Test Message Events

### 5.1 Create Message

In a new terminal:

```bash
curl -X POST http://localhost:5000/api/workspaces/WORKSPACE_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"Hello from Socket.IO test!\"}"
```

**In the Socket.IO terminal, you should see:**
```
📨 NEW MESSAGE:
   ID: 65abc456def789012345
   Text: Hello from Socket.IO test!
   Sender: user-test-001
   Created: 2024-01-01T00:00:00.000Z
```

✅ **message-created event received!**

### 5.2 Update Message

Get the message ID from the response above, then:

```bash
curl -X PUT http://localhost:5000/api/messages/MESSAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"Updated message text!\"}"
```

**In the Socket.IO terminal:**
```
✏️  MESSAGE UPDATED:
   ID: 65abc456def789012345
   Text: Updated message text!
   Edited: true
   Updated: 2024-01-01T00:01:00.000Z
```

✅ **message-updated event received!**

### 5.3 Delete Message

```bash
curl -X DELETE http://localhost:5000/api/messages/MESSAGE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**In the Socket.IO terminal:**
```
🗑️  MESSAGE DELETED:
   ID: 65abc456def789012345
```

✅ **message-deleted event received!**

---

## Step 6: Test Comment Events

### 6.1 Create Comment

```bash
curl -X POST http://localhost:5000/api/workspaces/WORKSPACE_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"This is a test comment\", \"fileRef\": \"test.js\", \"lineNumber\": 42}"
```

**In the Socket.IO terminal:**
```
💬 NEW COMMENT:
   ID: 65abc789def012345678
   Text: This is a test comment
   Author: user-test-001
   Parent: None (top-level)
   Created: 2024-01-01T00:02:00.000Z
```

✅ **comment-created event received!**

### 6.2 Create Reply

Using the comment ID from above:

```bash
curl -X POST http://localhost:5000/api/comments/COMMENT_ID/reply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"This is a reply to the comment\"}"
```

**In the Socket.IO terminal:**
```
💬 NEW COMMENT:
   ID: 65abc012def345678901
   Text: This is a reply to the comment
   Author: user-test-001
   Parent: 65abc789def012345678
   Created: 2024-01-01T00:03:00.000Z
```

✅ **comment-created event received for reply!**

### 6.3 Update Comment

```bash
curl -X PUT http://localhost:5000/api/comments/COMMENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"Updated comment text\"}"
```

**In the Socket.IO terminal:**
```
✏️  COMMENT UPDATED:
   ID: 65abc789def012345678
   Text: Updated comment text
   Edited: true
   Updated: 2024-01-01T00:04:00.000Z
```

✅ **comment-updated event received!**

### 6.4 Delete Comment

```bash
curl -X DELETE http://localhost:5000/api/comments/COMMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**In the Socket.IO terminal:**
```
🗑️  COMMENT DELETED:
   ID: 65abc789def012345678
```

✅ **comment-deleted event received!**

---

## Step 7: Test Multiple Clients

### 7.1 Start Second Client

Open another terminal:

```bash
node scripts/testSocketIO.js YOUR_TOKEN WORKSPACE_ID
```

You should see the same connection messages.

### 7.2 Trigger Event from First Client

In the first Socket.IO terminal, you should see events.

### 7.3 Check Second Client

Both terminals should receive the same events! ✅

This proves:
- Multiple clients can connect
- Events broadcast to all clients in the room

---

## Step 8: Test Room Isolation

### 8.1 Create Second Workspace

```bash
curl -X POST http://localhost:5000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"projectId\": \"test-project-2\"}"
```

Copy the new workspace ID.

### 8.2 Connect Client to Second Workspace

```bash
node scripts/testSocketIO.js YOUR_TOKEN SECOND_WORKSPACE_ID
```

### 8.3 Create Message in First Workspace

```bash
curl -X POST http://localhost:5000/api/workspaces/FIRST_WORKSPACE_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"text\": \"Only first workspace should see this\"}"
```

**Expected:**
- First workspace clients: ✅ See the event
- Second workspace client: ❌ Does NOT see the event

This proves room isolation works correctly! ✅

---

## Step 9: Test Authentication Failures

### 9.1 Invalid Token

```bash
node scripts/testSocketIO.js "invalid-token" WORKSPACE_ID
```

**Expected:**
```
❌ Connection error: Invalid or expired token
```

✅ **Authentication rejection works!**

### 9.2 Missing Token

Try to connect without a token programmatically:

```javascript
const socket = io('http://localhost:5000');
// Will be rejected - no token provided
```

---

## Step 10: Test Error Handling

### 10.1 Invalid Workspace ID

In the Socket.IO terminal, manually emit:

```javascript
socket.emit('join-workspace', { workspaceId: 'invalid-id' });
```

You should receive an error event.

### 10.2 Missing Workspace ID

```javascript
socket.emit('join-workspace', {});
```

Should receive: "Workspace ID is required"

---

## Test Checklist

Run through this checklist to verify everything works:

### Authentication
- ✅ Valid token connects successfully
- ✅ Invalid token rejected
- ✅ Missing token rejected

### Room Operations
- ✅ Can join workspace room
- ✅ Can leave workspace room
- ✅ Receive join acknowledgment
- ✅ Receive leave acknowledgment

### Message Events
- ✅ message-created broadcasts correctly
- ✅ message-updated broadcasts correctly
- ✅ message-deleted broadcasts correctly
- ✅ Events contain correct data

### Comment Events
- ✅ comment-created broadcasts correctly
- ✅ comment-created for replies works
- ✅ comment-updated broadcasts correctly
- ✅ comment-deleted broadcasts correctly
- ✅ Events contain correct data

### Multi-Client
- ✅ Multiple clients can connect
- ✅ All clients receive events
- ✅ Clients can disconnect cleanly

### Room Isolation
- ✅ Events only go to correct workspace
- ✅ Different workspaces don't receive each other's events

### Error Handling
- ✅ Invalid workspace ID rejected
- ✅ Missing workspace ID rejected
- ✅ Error events emitted correctly

---

## Troubleshooting

### Socket won't connect

**Check:**
1. Is backend running? (`npm run dev`)
2. Is MongoDB running?
3. Is Redis running?
4. Is the token valid? (not expired)
5. Check server logs for errors

### Events not received

**Check:**
1. Did you join the workspace? (`join-workspace`)
2. Are you in the correct workspace?
3. Is the message/comment being created successfully?
4. Check server logs for emission logs

### "Connection error: Invalid or expired token"

**Fix:**
1. Generate a new token: `node scripts/generateToken.js`
2. Token expires after 24 hours by default

### Multiple events received

**Check:**
1. Are you running multiple socket instances?
2. Are you reconnecting without disconnecting first?
3. Clean up sockets when done

---

## Performance Testing

### Load Test (Optional)

Create a simple script to connect multiple clients:

```javascript
// loadTest.js
import { io } from 'socket.io-client';

const NUM_CLIENTS = 10;
const token = process.argv[2];
const workspaceId = process.argv[3];

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io('http://localhost:5000', {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log(`Client ${i + 1} connected`);
    socket.emit('join-workspace', { workspaceId });
  });

  socket.on('message-created', (msg) => {
    console.log(`Client ${i + 1} received message`);
  });
}
```

Run:
```bash
node loadTest.js YOUR_TOKEN WORKSPACE_ID
```

All clients should connect and receive events.

---

## Success Criteria

Phase 5 testing is complete when:

✅ All authentication tests pass  
✅ All room operation tests pass  
✅ All message event tests pass  
✅ All comment event tests pass  
✅ Multiple clients work correctly  
✅ Room isolation works correctly  
✅ Error handling works correctly  
✅ REST API continues to work normally  

---

## Next Steps

Once testing is complete:

1. ✅ **Integration Ready** - Frontend can integrate using `SOCKET_QUICK_START.md`
2. ✅ **Production Ready** - Deploy to staging/production
3. ✅ **Documentation Complete** - All docs available for team

---

## Getting Help

- **Quick Start:** `SOCKET_QUICK_START.md`
- **Implementation Details:** `PHASE5_SOCKET_IMPLEMENTATION.md`
- **API Reference:** `API_ENDPOINTS.md`
- **Summary:** `PHASE5_SUMMARY.md`

---

**Happy Testing!** 🚀
