# Workspace Service — Integration Guide

> **Audience:** Person A (Authentication Service) and Person C (Notification Service).
>
> This document explains everything you need to integrate with the Workspace Service without inspecting its source code. It covers what the service owns, how authentication works, how to call its REST API and Socket.IO server, what notifications it fires, and exactly what changes when your services go live.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Integration (Person A)](#2-authentication-integration-person-a)
3. [REST API Integration](#3-rest-api-integration)
4. [Socket.IO Integration](#4-socketio-integration)
5. [Notification Integration (Person C)](#5-notification-integration-person-c)
6. [Auth Client Contract (Person A)](#6-auth-client-contract-person-a)
7. [Future Integration — Going Live](#7-future-integration--going-live)

---

## 1. Overview

### What the Workspace Service owns

- **Workspaces** — a workspace is a collaboration context tied to a single project (`projectId`). It links a student (`studentId`) and a startup (`startupId`) and has a lifecycle status (`ACTIVE` / `ARCHIVED`).
- **Messages** — real-time chat messages within a workspace. Supports create, edit, and soft-delete. Only the author can modify or delete their own messages.
- **Comments** — threaded, file-level or line-level annotations within a workspace. Supports top-level comments, nested replies, edit, and soft-delete. Only the author can modify or delete their own comments.
- **Real-time delivery** — every mutating operation (create / update / delete) on messages and comments is broadcast to all connected clients in the affected workspace room via Socket.IO immediately after the database write succeeds.
- **Notification dispatch** — every mutating operation also triggers a non-blocking notification call to the Notification Service.

### What the Workspace Service does NOT own

- **User identity and authentication** — it does not store users, issue tokens, or manage sessions. It only *verifies* tokens issued by the Auth Service.
- **User profile data** — `senderId` and `authorId` are string identifiers sourced from the JWT `sub` claim. The Workspace Service stores them as opaque strings and does not enrich them with display names, avatars, or roles.
- **Project data** — `projectId`, `studentId`, and `startupId` are stored as opaque strings. Project lifecycle and membership are managed externally.
- **Push / email / in-app notifications** — it fires notification events to the Notification Service but does not deliver them itself.
- **File storage** — `fileRef` and `lineNumber` in comments are stored as-is. The Workspace Service does not validate whether a file exists.

---

## 2. Authentication Integration (Person A)

### How JWT authentication works

The Workspace Service is a **JWT verifier only** — it never issues tokens. Every incoming HTTP request and every Socket.IO connection must carry a valid JWT signed by the Auth Service's private key.

The service loads the RS256 public key from the file path specified in `JWT_PUBLIC_KEY_PATH` once at startup, caches it in memory, and uses it to verify every token for the lifetime of the process.

### Authorization header format (REST)

```
Authorization: Bearer <token>
```

The middleware checks for exactly two space-separated parts: the literal string `Bearer` and the token. Any other format returns `401`.

### Socket.IO token delivery

For Socket.IO connections the token is read from (in priority order):

1. `socket.handshake.auth.token` — plain token string (recommended)
2. `socket.handshake.headers.authorization` — `Bearer <token>` format (fallback)

### Expected JWT payload

The Workspace Service reads exactly two claims from the decoded token:

| Claim | Maps to | Required | Notes |
|-------|---------|----------|-------|
| `sub` | `req.user.id` / `socket.user.id` | **Yes** — missing `sub` causes `401` | Used as the user's identifier throughout the service. Stored as `senderId` on messages and `authorId` on comments. |
| `role` | `req.user.role` / `socket.user.role` | No | Defaults to `"user"` if absent. Currently stored but not used for authorization decisions. |

No other claims are read. Standard claims (`iat`, `exp`, `nbf`) are validated automatically by `jsonwebtoken`:

- Expired tokens → `401 Token has expired`
- `nbf` in the future → `401 Token not yet valid`
- Bad signature → `401 Invalid token`

### Current mock behaviour

The `authClient.js` mock is used when `AUTH_SERVICE_ENABLED=false` (the current default). The mock is called internally by services — it is **not** part of the token verification path. Token verification always uses the real JWT utility regardless of the mock flag.

The mock is used for calls such as `getUser()`, `validateUser()`, and `checkWorkspacePermission()` which are wired up in the client but not yet called from any controller or service in the current implementation. They are ready for use when needed.

### What changes when Person A provides the production public key

1. Copy the production RS256 public key PEM file onto the server.
2. Set `JWT_PUBLIC_KEY_PATH` in `.env` to point to it.
3. Restart the service.

That is all. No code changes are required for the standard RS256 / PEM flow.

If Person A provides a **JWKS endpoint** instead of a static PEM file, only `src/utils/jwt.js` needs to be updated to fetch and cache the key from the JWKS URL. No other file in the service needs to change.

---

## 3. REST API Integration

### Which endpoints other services may call

Both Person A and Person C may call any authenticated endpoint as a service-to-service call by presenting a valid JWT in the `Authorization` header.

The most relevant endpoints for integration purposes are:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workspaces/:id` | Look up a workspace by its ObjectId |
| `GET` | `/api/workspaces/project/:projectId` | Look up a workspace by project ID |
| `GET` | `/api/workspaces/:workspaceId/messages` | Fetch all messages in a workspace |
| `GET` | `/api/workspaces/:workspaceId/comments` | Fetch all comments with replies in a workspace |

### Endpoints they should NOT call directly

The mutation endpoints (`POST`, `PUT`, `DELETE`) are designed for end-user clients. They enforce author-only authorization by comparing `req.user.id` (from the JWT) against the stored `senderId` / `authorId`. A service calling these endpoints would need a JWT whose `sub` matches the relevant user, which is not a typical service-to-service pattern.

### Authentication requirements

All `/api/*` endpoints require `Authorization: Bearer <token>`. There is no service-to-service bypass or API key mechanism — a valid JWT is always required.

### Expected request flow (typical client)

```
Client
  │
  ├── 1. Obtain JWT from Auth Service
  │
  ├── 2. REST: POST /api/workspaces/:id/messages  (Authorization: Bearer <token>)
  │         └── Workspace Service verifies JWT → writes to MongoDB → emits Socket.IO event
  │                                                                → fires Notification
  │
  └── 3. Socket.IO: receives 'message-created' event on workspace room
```

### Error handling

All error responses follow a consistent envelope:

```json
{
  "success": false,
  "message": "<human-readable message>",
  "errors": ["..."]   // present only for 400 validation failures
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation failed — check the `errors` array |
| `401` | Missing, expired, or invalid JWT |
| `403` | Authenticated but not the author of the resource |
| `404` | Workspace, message, or comment not found |
| `500` | Internal server error |

---

## 4. Socket.IO Integration

### Connection

Connect to the same host and port as the REST API:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: '<JWT>' }
});
```

### Authentication

Authentication happens at the connection handshake. If the token is missing, expired, or invalid the connection is rejected before the `connect` event fires. Listen for `connect_error` to handle this.

```js
socket.on('connect_error', (err) => {
  // err.message contains the rejection reason
  console.error(err.message);
});
```

### Joining a workspace room

After connecting, emit `join-workspace` with the workspace's ObjectId. Only sockets that have joined the room receive broadcast events for that workspace.

```js
socket.emit('join-workspace', { workspaceId: '64b1f2c3e4d5f6a7b8c9d0e1' });

socket.on('joined-workspace', ({ room }) => {
  console.log('Now receiving events for', room);
});
```

### Receiving events

```js
socket.on('message-created', (message) => { /* full Message document */ });
socket.on('message-updated', (message) => { /* full Message document */ });
socket.on('message-deleted', ({ messageId }) => { /* ID only */ });

socket.on('comment-created', (comment) => { /* full Comment document — covers both comments and replies */ });
socket.on('comment-updated', (comment) => { /* full Comment document */ });
socket.on('comment-deleted', ({ commentId }) => { /* ID only */ });
```

Note: `message-deleted` and `comment-deleted` carry only the ID — not the full document. Clients should remove the item from local state by ID.

### Leaving a room

```js
socket.emit('leave-workspace', { workspaceId: '64b1f2c3e4d5f6a7b8c9d0e1' });
```

### Disconnect behaviour

When a socket disconnects for any reason, Socket.IO automatically removes it from all rooms it had joined. No explicit cleanup is required on the server. Other connected clients are not notified — the Workspace Service does not emit a "user left" event.

---

## 5. Notification Integration (Person C)

### When the Workspace Service triggers notifications

The Workspace Service fires a notification call after every successful mutating operation. The call is **non-blocking and fire-and-forget** — if the Notification Service is unavailable, the REST response and Socket.IO event are unaffected. Failures are logged but not surfaced to the caller.

| Trigger (REST operation) | Method called | Payload |
|--------------------------|--------------|---------|
| `POST /api/workspaces/:id/messages` | `sendMessageCreated` | See below |
| `PUT /api/messages/:id` | `sendMessageUpdated` | See below |
| `DELETE /api/messages/:id` | `sendMessageDeleted` | See below |
| `POST /api/workspaces/:id/comments` | `sendCommentCreated` | See below |
| `POST /api/comments/:id/reply` | `sendCommentCreated` | See below (with `isReply: true`) |
| `PUT /api/comments/:id` | `sendCommentUpdated` | See below |
| `DELETE /api/comments/:id` | `sendCommentDeleted` | See below |

### Notification payloads — the contract for Person C

These are the exact payloads the Workspace Service will POST to the Notification Service's endpoints when `NOTIFICATION_SERVICE_ENABLED=true`. Treat these as the integration contract.

#### `message-created`

Target endpoint: `POST /api/notifications/message-created`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "messageId": "64c2a3b4d5e6f7a8b9c0d1e2",
  "senderId": "user_abc123",
  "text": "Let's sync on the API design.",
  "type": "TEXT"
}
```

#### `message-updated`

Target endpoint: `POST /api/notifications/message-updated`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "messageId": "64c2a3b4d5e6f7a8b9c0d1e2",
  "senderId": "user_abc123",
  "text": "Let's sync on the API design tomorrow.",
  "isEdited": true
}
```

#### `message-deleted`

Target endpoint: `POST /api/notifications/message-deleted`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "messageId": "64c2a3b4d5e6f7a8b9c0d1e2",
  "senderId": "user_abc123"
}
```

#### `comment-created` (new top-level comment)

Target endpoint: `POST /api/notifications/comment-created`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "commentId": "64d3b4c5d6e7f8a9b0c1d2e3",
  "authorId": "user_abc123",
  "text": "This function needs error handling.",
  "fileRef": "src/api/user.js",
  "lineNumber": 42,
  "parentId": null
}
```

#### `comment-created` (reply)

Target endpoint: `POST /api/notifications/comment-created`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "commentId": "64d3b4c5d6e7f8a9b0c1d2e4",
  "authorId": "user_xyz789",
  "text": "Agreed, I'll add try-catch.",
  "parentId": "64d3b4c5d6e7f8a9b0c1d2e3",
  "isReply": true
}
```

#### `comment-updated`

Target endpoint: `POST /api/notifications/comment-updated`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "commentId": "64d3b4c5d6e7f8a9b0c1d2e3",
  "authorId": "user_abc123",
  "text": "This function needs error handling and input validation.",
  "isEdited": true
}
```

#### `comment-deleted`

Target endpoint: `POST /api/notifications/comment-deleted`

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "commentId": "64d3b4c5d6e7f8a9b0c1d2e3",
  "authorId": "user_abc123"
}
```

### Mock response (current behaviour)

While `NOTIFICATION_SERVICE_ENABLED=false`, every call returns:

```json
{
  "success": true,
  "notificationId": "mock-notif-1722000000000",
  "type": "message-created",
  "sent": true
}
```

The `notificationId` is a timestamp-based string. The Workspace Service does not use the response value — it is purely informational.

---

## 6. Auth Client Contract (Person A)

The Workspace Service exposes four methods via `src/clients/authClient.js`. All are currently mocked. These are the expected request/response structures when the live Auth Service is connected.

### `getUser(userId)`

Retrieves information about a single user.

**Intended Auth Service endpoint:** `GET /api/users/:userId`

**Current mock response:**

```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "exists": true,
    "active": true,
    "username": "user_user_abc123",
    "email": "user_abc123@example.com",
    "role": "user",
    "createdAt": "2026-08-07T10:00:00.000Z"
  }
}
```

**Expected contract from the real Auth Service** — at minimum the response must include:

| Field | Type | Notes |
|-------|------|-------|
| `success` | boolean | `true` on success |
| `data.id` | string | Must match the requested `userId` |
| `data.exists` | boolean | Whether the user record exists |
| `data.active` | boolean | Whether the user account is active |

---

### `validateUser(userId)`

Checks whether a user exists and is active.

**Intended Auth Service endpoint:** `GET /api/users/:userId/validate`

**Current mock response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "exists": true,
    "active": true,
    "userId": "user_abc123"
  }
}
```

**Expected contract from the real Auth Service** — at minimum:

| Field | Type | Notes |
|-------|------|-------|
| `success` | boolean | `true` on success |
| `data.valid` | boolean | Combined `exists && active` |
| `data.exists` | boolean | — |
| `data.active` | boolean | — |
| `data.userId` | string | Echo of the requested ID |

---

### `getUsersBatch(userIds)`

Retrieves information about multiple users in a single call.

**Intended Auth Service endpoint:** `POST /api/users/batch`

**Request body sent by the Workspace Service:**

```json
{
  "userIds": ["user_abc123", "user_xyz789"]
}
```

**Current mock response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_abc123",
      "exists": true,
      "active": true,
      "username": "user_user_abc123",
      "email": "user_abc123@example.com",
      "role": "user"
    },
    {
      "id": "user_xyz789",
      "exists": true,
      "active": true,
      "username": "user_user_xyz789",
      "email": "user_xyz789@example.com",
      "role": "user"
    }
  ]
}
```

**Expected contract from the real Auth Service** — at minimum:

| Field | Type | Notes |
|-------|------|-------|
| `success` | boolean | `true` on success |
| `data` | array | One entry per requested `userId`, in any order |
| `data[].id` | string | Must match one of the requested IDs |
| `data[].exists` | boolean | — |
| `data[].active` | boolean | — |

---

### `checkWorkspacePermission(userId, workspaceId, action)`

Checks whether a user is permitted to perform an action on a workspace.

**Intended Auth Service endpoint:** `POST /api/users/:userId/permissions`

**Request body sent by the Workspace Service:**

```json
{
  "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
  "action": "read"
}
```

Valid `action` values used by the Workspace Service: `"read"`, `"write"`, `"delete"`.

**Current mock response** (always grants permission):

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "userId": "user_abc123",
    "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
    "action": "read",
    "role": "member"
  }
}
```

**Expected contract from the real Auth Service** — at minimum:

| Field | Type | Notes |
|-------|------|-------|
| `success` | boolean | `true` on success |
| `data.allowed` | boolean | `true` if the action is permitted |
| `data.userId` | string | Echo of the requesting user |
| `data.workspaceId` | string | Echo of the workspace |
| `data.action` | string | Echo of the action |

---

## 7. Future Integration — Going Live

When Person A's Auth Service and Person C's Notification Service are ready, the integration switchover is minimal and surgical. The core business logic, controllers, services, routes, models, and Socket.IO handlers are all unchanged.

### Exactly which files need to change

| File | Who changes it | What changes |
|------|---------------|--------------|
| `src/clients/authClient.js` | Person A / Workspace team | Replace the `// FUTURE IMPLEMENTATION` comment blocks with real `axios` HTTP calls to the Auth Service endpoints. Remove the `_mock*` private methods. |
| `src/clients/notificationClient.js` | Person C / Workspace team | Replace the `// FUTURE IMPLEMENTATION` comment blocks with real `axios` HTTP calls to the Notification Service endpoints. Remove the `_mock*` private methods. |
| `.env` | Workspace team / DevOps | Set `AUTH_SERVICE_ENABLED=true` and `AUTH_SERVICE_URL` to the real URL. Set `NOTIFICATION_SERVICE_ENABLED=true` and `NOTIFICATION_SERVICE_URL` to the real URL. |
| `src/utils/jwt.js` | Person A / Workspace team | **Only if** Person A provides a JWKS endpoint instead of a static PEM file. If a static PEM is provided, this file does not change. |

### Everything else stays the same

- All route definitions (`src/routes/`)
- All controllers (`src/controllers/`)
- All services (`src/services/`)
- All models (`src/models/`)
- All middleware (`src/middleware/`)
- All Socket.IO handlers (`src/sockets/`)
- All validators (`src/validators/`)
- `src/config/services.js` — the `isServiceEnabled()` flag check is already in place and will route to real implementations automatically once the env vars are set.

### Switchover checklist

```
Person A (Auth Service):
  [ ] Confirm the RS256 public key PEM file is accessible on the server
  [ ] Set JWT_PUBLIC_KEY_PATH in .env to the correct path
  [ ] Set AUTH_SERVICE_URL to the live Auth Service base URL
  [ ] Set AUTH_SERVICE_ENABLED=true in .env
  [ ] Implement the HTTP calls in src/clients/authClient.js

Person C (Notification Service):
  [ ] Confirm the Notification Service is reachable at NOTIFICATION_SERVICE_URL
  [ ] Implement POST /api/notifications/message-created (and all other endpoints above)
  [ ] Set NOTIFICATION_SERVICE_URL in .env
  [ ] Set NOTIFICATION_SERVICE_ENABLED=true in .env
  [ ] Implement the HTTP calls in src/clients/notificationClient.js

Both:
  [ ] Restart the Workspace Service after .env changes
  [ ] Verify via logs — the service logs service config at startup:
        "auth: ✅ Enabled - http://..."
        "notification: ✅ Enabled - http://..."
```

### Service timeout

HTTP calls from `authClient.js` and `notificationClient.js` to external services use the timeout configured in `SERVICE_TIMEOUT` (default `5000` ms). Increase this in `.env` if your service requires it. Notification failures are non-blocking — a timeout or error from the Notification Service will never fail a user-facing request. Auth Service calls (if wired into request handling) would need appropriate error handling added in the client.
