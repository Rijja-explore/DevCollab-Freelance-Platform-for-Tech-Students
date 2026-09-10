# Socket.IO Quick Start Guide

## Overview

This workspace service now supports real-time communication via Socket.IO. All socket connections require JWT authentication.

---

## Quick Start (Client-Side)

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Connect with Authentication

```javascript
import { io } from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join workspace
  socket.emit('join-workspace', { 
    workspaceId: 'your-workspace-id' 
  });
});

// Handle successful join
socket.on('joined-workspace', (data) => {
  console.log('Joined:', data.workspaceId);
});
```

### 3. Listen for Events

```javascript
// New message
socket.on('message-created', (message) => {
  // Add message to UI
  addMessageToUI(message);
});

// Updated message
socket.on('message-updated', (message) => {
  // Update message in UI
  updateMessageInUI(message);
});

// Deleted message
socket.on('message-deleted', ({ messageId }) => {
  // Remove message from UI
  removeMessageFromUI(messageId);
});

// New comment
socket.on('comment-created', (comment) => {
  // Add comment to UI
  addCommentToUI(comment);
});

// Updated comment
socket.on('comment-updated', (comment) => {
  // Update comment in UI
  updateCommentInUI(comment);
});

// Deleted comment
socket.on('comment-deleted', ({ commentId }) => {
  // Remove comment from UI
  removeCommentFromUI(commentId);
});
```

### 4. Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Handle authentication failure
});
```

### 5. Cleanup

```javascript
// When leaving workspace
socket.emit('leave-workspace', { 
  workspaceId: 'your-workspace-id' 
});

// When unmounting component
socket.disconnect();
```

---

## Testing

### 1. Start Backend

```bash
cd backend
npm run dev
```

### 2. Generate Test Token

```bash
node scripts/generateToken.js
```

### 3. Test Socket Connection

```bash
node scripts/testSocketIO.js <token> <workspaceId>
```

### 4. Test with REST API

In another terminal, create a message:

```bash
curl -X POST http://localhost:5000/api/workspaces/<workspaceId>/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text": "Test message"}'
```

The socket test should show the real-time event.

---

## React Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function WorkspaceChat({ workspaceId, authToken }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Connect socket
    const newSocket = io('http://localhost:5000', {
      auth: { token: authToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected');
      newSocket.emit('join-workspace', { workspaceId });
    });

    newSocket.on('message-created', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('message-updated', (message) => {
      setMessages(prev => 
        prev.map(m => m._id === message._id ? message : m)
      );
    });

    newSocket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => 
        prev.filter(m => m._id !== messageId)
      );
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('leave-workspace', { workspaceId });
      newSocket.disconnect();
    };
  }, [workspaceId, authToken]);

  return (
    <div>
      {messages.map(msg => (
        <div key={msg._id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

---

## Vue Example

```javascript
<template>
  <div>
    <div v-for="message in messages" :key="message._id">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';

export default {
  props: ['workspaceId', 'authToken'],
  data() {
    return {
      socket: null,
      messages: []
    };
  },
  mounted() {
    this.socket = io('http://localhost:5000', {
      auth: { token: this.authToken }
    });

    this.socket.on('connect', () => {
      this.socket.emit('join-workspace', { 
        workspaceId: this.workspaceId 
      });
    });

    this.socket.on('message-created', (message) => {
      this.messages.push(message);
    });

    this.socket.on('message-updated', (message) => {
      const index = this.messages.findIndex(m => m._id === message._id);
      if (index !== -1) {
        this.messages.splice(index, 1, message);
      }
    });

    this.socket.on('message-deleted', ({ messageId }) => {
      this.messages = this.messages.filter(m => m._id !== messageId);
    });
  },
  beforeUnmount() {
    this.socket.emit('leave-workspace', { 
      workspaceId: this.workspaceId 
    });
    this.socket.disconnect();
  }
};
</script>
```

---

## Event Summary

### Client → Server
- `join-workspace` - Join a workspace room
- `leave-workspace` - Leave a workspace room

### Server → Client
- `message-created` - New message created
- `message-updated` - Message edited
- `message-deleted` - Message deleted
- `comment-created` - New comment/reply created
- `comment-updated` - Comment edited
- `comment-deleted` - Comment deleted
- `joined-workspace` - Successfully joined workspace
- `left-workspace` - Successfully left workspace
- `error` - Error occurred

---

## Authentication

All socket connections require a valid JWT token. The token must be:

1. **Provided** via `auth.token` in socket options
2. **Valid** - not expired or malformed
3. **Contains** required claims (`sub` for user ID)

Without authentication, connections will be rejected:

```
Error: Authentication token is required
Error: Invalid or expired token
```

---

## Troubleshooting

### Connection Fails
- Check if backend is running
- Verify JWT token is valid
- Check CORS configuration

### Events Not Received
- Verify you joined the workspace room
- Check if you're authenticated
- Confirm workspace ID is correct

### Multiple Events
- Ensure you're not creating duplicate socket connections
- Clean up sockets when components unmount

---

## Production Considerations

### CORS
Update CORS_ORIGIN in `.env`:

```bash
CORS_ORIGIN=https://your-frontend-domain.com
```

### WSS (Secure WebSocket)
Use HTTPS and WSS in production:

```javascript
const socket = io('https://your-api-domain.com', {
  auth: { token: authToken },
  secure: true
});
```

### Reconnection
Socket.IO handles reconnection automatically, but you can configure:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: authToken },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

---

## Need Help?

- Full documentation: `PHASE5_SOCKET_IMPLEMENTATION.md`
- Architecture details: `ARCHITECTURE.md`
- API endpoints: `API_ENDPOINTS.md`
