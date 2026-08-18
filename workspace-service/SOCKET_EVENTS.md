# Workspace Service — Socket.IO Events Reference

> **Source of truth:** Generated from the live implementation as of Phase 6.
> Socket.IO server runs on the same host and port as the HTTP server (default `5000`).

---

## Connection

### Endpoint

```
ws://<host>:<PORT>
```

The Socket.IO server shares the HTTP server instance. Connect using the Socket.IO client library targeting the same base URL as the REST API.

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: '<JWT>'           // preferred method
  }
});
```

---

## Authentication

Every Socket.IO connection is authenticated before it is accepted. Authentication is enforced in `socketAuthMiddleware.js` using the same JWT public key as the REST API.

### Token Delivery — Two Accepted Methods

| Priority | Method | Format |
|----------|--------|--------|
| 1 (preferred) | `socket.handshake.auth.token` | Plain token string |
| 2 (fallback) | `socket.handshake.headers.authorization` | `Bearer <token>` |

### What the Middleware Validates

1. A token must be present via one of the two methods above.
2. The token must verify against the RS256 public key at `JWT_PUBLIC_KEY_PATH`.
3. The JWT payload must contain the `sub` claim.

### Result on Success

`socket.user` is populated for the lifetime of the connection:

```json
{
  "id": "<value of JWT sub claim>",
  "role": "<value of JWT role claim, defaults to 'user'>"
}
```

### Connection Rejected Errors

If authentication fails, the connection is rejected and the client receives a connect error. The socket never reaches the `connection` event.

| Condition | Error message |
|-----------|--------------|
| No token provided | `Authentication token is required` |
| Token expired | `Token has expired` |
| Invalid signature / malformed | `Invalid token` |
| Token not yet valid | `Token not yet valid` |
| `sub` claim missing | `Token is missing required claims` |
| General failure | `Authentication failed` |

### Client-Side Example

```js
socket.on('connect_error', (err) => {
  console.error('Connection rejected:', err.message);
});
```

---

## Room Naming Convention

After connecting, a client must join a workspace room to receive workspace-scoped events.

```
workspace_<workspaceId>
```

Where `<workspaceId>` is the MongoDB ObjectId string of the workspace.

**Examples:**

| workspaceId | Room name |
|-------------|-----------|
| `64b1f2c3e4d5f6a7b8c9d0e1` | `workspace_64b1f2c3e4d5f6a7b8c9d0e1` |
| `64c2a3b4d5e6f7a8b9c0d1e2` | `workspace_64c2a3b4d5e6f7a8b9c0d1e2` |

A client may join multiple workspace rooms simultaneously.

---

## Client → Server Events

These are events the **client emits** to the server.

---

### `join-workspace`

Join a workspace room to start receiving real-time events for that workspace.

**Payload**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1"
}
```

**Behaviour**

1. Validates that `workspaceId` is present and a valid MongoDB ObjectId.
2. Constructs the room name: `workspace_<workspaceId>`.
3. Adds the socket to the room.
4. Emits `joined-workspace` back to the client as acknowledgement.

**On success — server emits `joined-workspace` back to the calling socket:**

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "room": "workspace_64b1f2c3e4d5f6a7b8c9d0e1",
  "message": "Successfully joined workspace"
}
```

**On failure — server emits `error` back to the calling socket:**

| Condition | `message` |
|-----------|-----------|
| `workspaceId` missing | `Workspace ID is required` |
| Invalid ObjectId format | `Invalid workspace ID format` |
| Unexpected exception | `Failed to join workspace` |

**Client-side example**

```js
socket.emit('join-workspace', { workspaceId: '64b1f2c3e4d5f6a7b8c9d0e1' });

socket.on('joined-workspace', (data) => {
  console.log('Joined room:', data.room);
});
```

---

### `leave-workspace`

Leave a workspace room to stop receiving real-time events for that workspace.

**Payload**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be present (ObjectId format not re-validated on leave) |

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1"
}
```

**Behaviour**

1. Validates that `workspaceId` is present.
2. Constructs the room name: `workspace_<workspaceId>`.
3. Removes the socket from the room.
4. Emits `left-workspace` back to the client as acknowledgement.

**On success — server emits `left-workspace` back to the calling socket:**

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "room": "workspace_64b1f2c3e4d5f6a7b8c9d0e1",
  "message": "Successfully left workspace"
}
```

**On failure — server emits `error` back to the calling socket:**

| Condition | `message` |
|-----------|-----------|
| `workspaceId` missing | `Workspace ID is required` |
| Unexpected exception | `Failed to leave workspace` |

**Client-side example**

```js
socket.emit('leave-workspace', { workspaceId: '64b1f2c3e4d5f6a7b8c9d0e1' });

socket.on('left-workspace', (data) => {
  console.log('Left room:', data.room);
});
```

---

## Server → Client Events

These are events the **server emits** to all sockets in a workspace room. They are triggered by REST API operations — not directly by Socket.IO client actions.

All server-to-client events are emitted to the room `workspace_<workspaceId>`. Every socket that has joined that room receives the event, including the socket that triggered the originating REST call.

---

### `message-created`

Emitted after `POST /api/workspaces/:workspaceId/messages` succeeds.

**Room:** `workspace_<workspaceId>`

**Payload** — full Message document

```json
{
  "id": "64c2a3b4d5e6f7a8b9c0d1e2",
  "workspaceId": {
    "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha"
  },
  "senderId": "user_abc123",
  "text": "Let's sync on the API design.",
  "type": "TEXT",
  "deleted": false,
  "edited": false,
  "editedAt": null,
  "createdAt": "2026-07-01T10:05:00.000Z",
  "updatedAt": "2026-07-01T10:05:00.000Z"
}
```

---

### `message-updated`

Emitted after `PUT /api/messages/:messageId` succeeds.

**Room:** `workspace_<workspaceId>` (derived from the message's `workspaceId`)

**Payload** — full updated Message document

```json
{
  "id": "64c2a3b4d5e6f7a8b9c0d1e2",
  "workspaceId": {
    "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha"
  },
  "senderId": "user_abc123",
  "text": "Let's sync on the API design tomorrow.",
  "type": "TEXT",
  "deleted": false,
  "edited": true,
  "editedAt": "2026-07-01T10:10:00.000Z",
  "createdAt": "2026-07-01T10:05:00.000Z",
  "updatedAt": "2026-07-01T10:10:00.000Z"
}
```

---

### `message-deleted`

Emitted after `DELETE /api/messages/:messageId` succeeds.

**Room:** `workspace_<workspaceId>` (derived from the message's `workspaceId`)

**Payload** — message ID only (not the full document)

```json
{
  "messageId": "64c2a3b4d5e6f7a8b9c0d1e2"
}
```

---

### `comment-created`

Emitted after `POST /api/workspaces/:workspaceId/comments` **or** `POST /api/comments/:commentId/reply` succeeds.

**Room:** `workspace_<workspaceId>`

**Payload** — full Comment document (applies to both new comments and new replies)

```json
{
  "id": "64d3b4c5d6e7f8a9b0c1d2e3",
  "workspaceId": {
    "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha"
  },
  "fileRef": "src/api/user.js",
  "lineNumber": 42,
  "authorId": "user_abc123",
  "text": "This function needs error handling.",
  "parentId": null,
  "deleted": false,
  "edited": false,
  "editedAt": null,
  "replyCount": 0,
  "createdAt": "2026-07-01T11:00:00.000Z",
  "updatedAt": "2026-07-01T11:00:00.000Z"
}
```

For a **reply**, `parentId` will be set to the parent comment's ObjectId string, and `replyCount` will be `0` (the parent's `replyCount` is incremented separately in the database but is not re-emitted via socket).

---

### `comment-updated`

Emitted after `PUT /api/comments/:commentId` succeeds.

**Room:** `workspace_<workspaceId>` (derived from the comment's `workspaceId`)

**Payload** — full updated Comment document

```json
{
  "id": "64d3b4c5d6e7f8a9b0c1d2e3",
  "workspaceId": {
    "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha"
  },
  "fileRef": "src/api/user.js",
  "lineNumber": 42,
  "authorId": "user_abc123",
  "text": "This function needs error handling and input validation.",
  "parentId": null,
  "deleted": false,
  "edited": true,
  "editedAt": "2026-07-01T11:15:00.000Z",
  "replyCount": 1,
  "createdAt": "2026-07-01T11:00:00.000Z",
  "updatedAt": "2026-07-01T11:15:00.000Z"
}
```

---

### `comment-deleted`

Emitted after `DELETE /api/comments/:commentId` succeeds.

**Room:** `workspace_<workspaceId>` (derived from the comment's `workspaceId`)

**Payload** — comment ID only (not the full document)

```json
{
  "commentId": "64d3b4c5d6e7f8a9b0c1d2e3"
}
```

---

### `error` (server → client)

Emitted to the individual socket when a socket-level operation fails (e.g. invalid `join-workspace` payload). This is distinct from the HTTP REST error responses.

```json
{
  "message": "Invalid workspace ID format"
}
```

---

## Disconnect

When a socket disconnects for any reason, the server logs the disconnection with the user ID and reason. No explicit cleanup event is emitted back to other sockets — room membership is automatically cleared by Socket.IO.

The client can listen for its own disconnect:

```js
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason examples: 'io server disconnect', 'transport close', 'ping timeout'
});
```

---

## Event Summary Table

### Client → Server

| Event | Payload Fields | Auth Required | Description |
|-------|---------------|---------------|-------------|
| `join-workspace` | `workspaceId` (ObjectId string) | Yes (connection-level) | Join a workspace room |
| `leave-workspace` | `workspaceId` (string) | Yes (connection-level) | Leave a workspace room |

### Server → Client

| Event | Trigger (REST) | Room | Payload |
|-------|---------------|------|---------|
| `joined-workspace` | `join-workspace` socket event | Calling socket only | `{ workspaceId, room, message }` |
| `left-workspace` | `leave-workspace` socket event | Calling socket only | `{ workspaceId, room, message }` |
| `message-created` | `POST /api/workspaces/:id/messages` | `workspace_<workspaceId>` | Full Message document |
| `message-updated` | `PUT /api/messages/:id` | `workspace_<workspaceId>` | Full Message document |
| `message-deleted` | `DELETE /api/messages/:id` | `workspace_<workspaceId>` | `{ messageId }` |
| `comment-created` | `POST /api/workspaces/:id/comments` or `POST /api/comments/:id/reply` | `workspace_<workspaceId>` | Full Comment document |
| `comment-updated` | `PUT /api/comments/:id` | `workspace_<workspaceId>` | Full Comment document |
| `comment-deleted` | `DELETE /api/comments/:id` | `workspace_<workspaceId>` | `{ commentId }` |
| `error` | Invalid socket payload | Calling socket only | `{ message }` |

---

## Complete Client Integration Example

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: '<JWT>' }
});

// Connection lifecycle
socket.on('connect', () => {
  console.log('Connected:', socket.id);

  // Join a workspace room
  socket.emit('join-workspace', { workspaceId: '64b1f2c3e4d5f6a7b8c9d0e1' });
});

socket.on('connect_error', (err) => {
  console.error('Auth failed:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Room join/leave acknowledgements
socket.on('joined-workspace', (data) => {
  console.log('Now in room:', data.room);
});

socket.on('left-workspace', (data) => {
  console.log('Left room:', data.room);
});

// Real-time message events
socket.on('message-created', (message) => { /* handle */ });
socket.on('message-updated', (message) => { /* handle */ });
socket.on('message-deleted', ({ messageId }) => { /* handle */ });

// Real-time comment events
socket.on('comment-created', (comment) => { /* handle */ });
socket.on('comment-updated', (comment) => { /* handle */ });
socket.on('comment-deleted', ({ commentId }) => { /* handle */ });

// Socket-level errors
socket.on('error', ({ message }) => {
  console.error('Socket error:', message);
});
```
