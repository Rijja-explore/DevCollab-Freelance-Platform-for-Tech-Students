# Workspace Service — REST API Reference

> **Source of truth:** Generated from the live implementation as of Phase 6.
> Base URL: `http://<host>:<PORT>/api`
> Default port: `5000`

---

## Authentication

Every endpoint (except `/health`) requires a valid JWT in the `Authorization` header.

```
Authorization: Bearer <token>
```

The token must be signed with the RS256 private key whose corresponding public key is configured in `JWT_PUBLIC_KEY_PATH`.  
The middleware extracts `sub` → `req.user.id` and `role` → `req.user.role`.

**Common auth error responses**

| Status | Message |
|--------|---------|
| `401` | `Authorization header is missing` |
| `401` | `Authorization header format must be: Bearer <token>` |
| `401` | `Token is missing` |
| `401` | `Token has expired` |
| `401` | `Invalid token` |
| `401` | `Token is missing required claims` |
| `500` | `Internal server error during authentication` |

---

## Health Check

### `GET /health`

No authentication required.

**Response `200`**
```json
{
  "status": "running",
  "service": "Workspace Service",
  "timestamp": "2026-08-07T10:00:00.000Z",
  "uptime": 3600.5
}
```

---

## Workspaces

### `GET /api/workspaces/:id`

Get a workspace by its MongoDB ObjectId.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/workspaces/:id` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `id` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha",
    "studentId": "user_abc123",
    "startupId": "startup_xyz789",
    "status": "ACTIVE",
    "createdAt": "2026-07-01T09:00:00.000Z",
    "updatedAt": "2026-07-01T09:00:00.000Z"
  }
}
```

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error (see Authentication section) |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to retrieve workspace` |

**Example Request**
```http
GET /api/workspaces/64b1f2c3e4d5f6a7b8c9d0e1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

**Validation Error Example**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Invalid workspace ID format"]
}
```

---

### `GET /api/workspaces/project/:projectId`

Get a workspace by its business-key project ID.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/workspaces/project/:projectId` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `projectId` | string | Yes | Alphanumeric, hyphens and underscores only; non-empty |

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "64b1f2c3e4d5f6a7b8c9d0e1",
    "projectId": "project-alpha",
    "studentId": "user_abc123",
    "startupId": "startup_xyz789",
    "status": "ACTIVE",
    "createdAt": "2026-07-01T09:00:00.000Z",
    "updatedAt": "2026-07-01T09:00:00.000Z"
  }
}
```

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to retrieve workspace` |

**Example Request**
```http
GET /api/workspaces/project/project-alpha
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## Messages

### `GET /api/workspaces/:workspaceId/messages`

Get all non-deleted messages for a workspace, sorted oldest-first.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/workspaces/:workspaceId/messages` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Query Parameters** — None

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "64c2a3b4d5e6f7a8b9c0d1e2",
      "workspaceId": {
        "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
        "projectId": "project-alpha"
      },
      "senderId": "user_abc123",
      "text": "Hello everyone!",
      "type": "TEXT",
      "deleted": false,
      "edited": false,
      "editedAt": null,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to retrieve messages` |

**Example Request**
```http
GET /api/workspaces/64b1f2c3e4d5f6a7b8c9d0e1/messages
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

### `POST /api/workspaces/:workspaceId/messages`

Create a new message in a workspace. The `senderId` is taken from the authenticated user (`req.user.id`) — **do not supply it in the request body**.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/workspaces/:workspaceId/messages` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | Yes | 1–5000 characters, non-empty after trim |
| `type` | string | No | `TEXT` or `SYSTEM`; defaults to `TEXT` |

```json
{
  "text": "Let's sync on the API design.",
  "type": "TEXT"
}
```

**Success Response `201`**
```json
{
  "success": true,
  "data": {
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
}
```

After a successful create the service also:
- Emits `message-created` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendMessageCreated` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to create message` |

**Example Request**
```http
POST /api/workspaces/64b1f2c3e4d5f6a7b8c9d0e1/messages
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "text": "Let's sync on the API design."
}
```

---

### `PUT /api/messages/:messageId`

Edit an existing message. Only the message author (identified by `senderId`) can edit.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Endpoint** | `/api/messages/:messageId` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `messageId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | Yes | 1–5000 characters, non-empty after trim |

```json
{
  "text": "Let's sync on the API design tomorrow."
}
```

**Success Response `200`**
```json
{
  "success": true,
  "data": {
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
}
```

After a successful edit the service also:
- Emits `message-updated` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendMessageUpdated` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `400` | `false` | `Cannot edit deleted message` |
| `401` | `false` | Auth error |
| `403` | `false` | `Forbidden: You can only edit your own messages` |
| `404` | `false` | `Message not found` |
| `500` | `false` | `Failed to edit message` |

**Example Request**
```http
PUT /api/messages/64c2a3b4d5e6f7a8b9c0d1e2
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "text": "Let's sync on the API design tomorrow."
}
```

---

### `DELETE /api/messages/:messageId`

Soft-delete a message. Only the author can delete. The message is marked `deleted: true` but remains in the database.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Endpoint** | `/api/messages/:messageId` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `messageId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

After a successful delete the service also:
- Emits `message-deleted` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendMessageDeleted` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `400` | `false` | `Message already deleted` |
| `401` | `false` | Auth error |
| `403` | `false` | `Forbidden: You can only delete your own messages` |
| `404` | `false` | `Message not found` |
| `500` | `false` | `Failed to delete message` |

**Example Request**
```http
DELETE /api/messages/64c2a3b4d5e6f7a8b9c0d1e2
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## Comments

### `GET /api/workspaces/:workspaceId/comments`

Get all non-deleted top-level comments with their nested replies for a workspace. Top-level comments are sorted newest-first; replies within each comment are sorted oldest-first.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **Endpoint** | `/api/workspaces/:workspaceId/comments` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Query Parameters** — None

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "data": [
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
      "replyCount": 1,
      "createdAt": "2026-07-01T11:00:00.000Z",
      "updatedAt": "2026-07-01T11:00:00.000Z",
      "replies": [
        {
          "id": "64d3b4c5d6e7f8a9b0c1d2e4",
          "workspaceId": "64b1f2c3e4d5f6a7b8c9d0e1",
          "fileRef": "src/api/user.js",
          "lineNumber": null,
          "authorId": "user_xyz789",
          "text": "Agreed, I'll add try-catch.",
          "parentId": "64d3b4c5d6e7f8a9b0c1d2e3",
          "deleted": false,
          "edited": false,
          "editedAt": null,
          "replyCount": 0,
          "createdAt": "2026-07-01T11:05:00.000Z",
          "updatedAt": "2026-07-01T11:05:00.000Z"
        }
      ]
    }
  ]
}
```

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to retrieve comments` |

**Example Request**
```http
GET /api/workspaces/64b1f2c3e4d5f6a7b8c9d0e1/comments
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

### `POST /api/workspaces/:workspaceId/comments`

Create a new top-level comment. The `authorId` is taken from the authenticated user — **do not supply it in the request body**.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/workspaces/:workspaceId/comments` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `workspaceId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | Yes | 1–10000 characters, non-empty after trim |
| `fileRef` | string | No | Max 500 characters |
| `lineNumber` | number | No | Integer 1–1000000 |

```json
{
  "text": "This function needs error handling.",
  "fileRef": "src/api/user.js",
  "lineNumber": 42
}
```

**Success Response `201`**
```json
{
  "success": true,
  "data": {
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
}
```

After a successful create the service also:
- Emits `comment-created` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendCommentCreated` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `401` | `false` | Auth error |
| `404` | `false` | `Workspace not found` |
| `500` | `false` | `Failed to create comment` |

**Example Request**
```http
POST /api/workspaces/64b1f2c3e4d5f6a7b8c9d0e1/comments
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "text": "This function needs error handling.",
  "fileRef": "src/api/user.js",
  "lineNumber": 42
}
```

---

### `POST /api/comments/:commentId/reply`

Create a reply to an existing comment. Inherits `workspaceId` and `fileRef` from the parent. The `authorId` is taken from the authenticated user — **do not supply it in the request body**.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Endpoint** | `/api/comments/:commentId/reply` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `commentId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | Yes | 1–10000 characters, non-empty after trim |

```json
{
  "text": "Agreed, I'll add try-catch."
}
```

**Success Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "64d3b4c5d6e7f8a9b0c1d2e4",
    "workspaceId": {
      "_id": "64b1f2c3e4d5f6a7b8c9d0e1",
      "projectId": "project-alpha"
    },
    "fileRef": "src/api/user.js",
    "lineNumber": null,
    "authorId": "user_xyz789",
    "text": "Agreed, I'll add try-catch.",
    "parentId": "64d3b4c5d6e7f8a9b0c1d2e3",
    "deleted": false,
    "edited": false,
    "editedAt": null,
    "replyCount": 0,
    "createdAt": "2026-07-01T11:05:00.000Z",
    "updatedAt": "2026-07-01T11:05:00.000Z"
  }
}
```

After a successful reply the service also:
- Emits `comment-created` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendCommentCreated` (with `isReply: true`) to the Notification Service
- Increments `replyCount` on the parent comment

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `400` | `false` | `Cannot reply to deleted comment` |
| `401` | `false` | Auth error |
| `404` | `false` | `Parent comment not found` |
| `500` | `false` | `Failed to create reply` |

**Example Request**
```http
POST /api/comments/64d3b4c5d6e7f8a9b0c1d2e3/reply
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "text": "Agreed, I'll add try-catch."
}
```

---

### `PUT /api/comments/:commentId`

Edit an existing comment. Only the author can edit.

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Endpoint** | `/api/comments/:commentId` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `commentId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `text` | string | Yes | 1–10000 characters, non-empty after trim |

```json
{
  "text": "This function needs error handling and input validation."
}
```

**Success Response `200`**
```json
{
  "success": true,
  "data": {
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
}
```

After a successful edit the service also:
- Emits `comment-updated` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendCommentUpdated` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `400` | `false` | `Cannot edit deleted comment` |
| `401` | `false` | Auth error |
| `403` | `false` | `Forbidden: You can only edit your own comments` |
| `404` | `false` | `Comment not found` |
| `500` | `false` | `Failed to edit comment` |

---

### `DELETE /api/comments/:commentId`

Soft-delete a comment. Only the author can delete. The comment is marked `deleted: true` but remains in the database.

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **Endpoint** | `/api/comments/:commentId` |
| **Authentication** | Required |

**Path Parameters**

| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `commentId` | string (MongoDB ObjectId) | Yes | Must be a valid MongoDB ObjectId |

**Request Body** — None

**Success Response `200`**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

After a successful delete the service also:
- Emits `comment-deleted` Socket.IO event to room `workspace_<workspaceId>`
- Fires a non-blocking `sendCommentDeleted` call to the Notification Service

**Error Responses**

| Status | `success` | `message` |
|--------|-----------|-----------|
| `400` | `false` | `Validation failed` + `errors` array |
| `400` | `false` | `Comment already deleted` |
| `401` | `false` | Auth error |
| `403` | `false` | `Forbidden: You can only delete your own comments` |
| `404` | `false` | `Comment not found` |
| `500` | `false` | `Failed to delete comment` |

**Example Request**
```http
DELETE /api/comments/64d3b4c5d6e7f8a9b0c1d2e3
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
```

---

## Data Models

### Workspace

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (ObjectId) | Mapped from `_id` |
| `projectId` | string | Unique business key; alphanumeric + hyphens/underscores; stored lowercase; max 100 chars |
| `studentId` | string | External user ID; max 50 chars |
| `startupId` | string | External startup ID; max 50 chars |
| `status` | string | `ACTIVE` or `ARCHIVED`; default `ACTIVE` |
| `createdAt` | ISO 8601 | Auto-managed |
| `updatedAt` | ISO 8601 | Auto-managed |

### Message

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (ObjectId) | Mapped from `_id` |
| `workspaceId` | object / string | Populated as `{ _id, projectId }` in responses |
| `senderId` | string | Set from authenticated user; max 50 chars |
| `text` | string | 1–5000 chars |
| `type` | string | `TEXT` or `SYSTEM`; default `TEXT` |
| `deleted` | boolean | Soft-delete flag; default `false` |
| `edited` | boolean | Edit flag; default `false` |
| `editedAt` | ISO 8601 / null | Set on first edit |
| `createdAt` | ISO 8601 | Auto-managed |
| `updatedAt` | ISO 8601 | Auto-managed |

### Comment

| Field | Type | Notes |
|-------|------|-------|
| `id` | string (ObjectId) | Mapped from `_id` |
| `workspaceId` | object / string | Populated as `{ _id, projectId }` in responses |
| `fileRef` | string / null | Optional file path or identifier; max 500 chars |
| `lineNumber` | number / null | Optional; 1–1000000 |
| `authorId` | string | Set from authenticated user; max 50 chars |
| `text` | string | 1–10000 chars |
| `parentId` | string (ObjectId) / null | `null` for top-level; set to parent comment ID for replies |
| `deleted` | boolean | Soft-delete flag; default `false` |
| `edited` | boolean | Edit flag; default `false` |
| `editedAt` | ISO 8601 / null | Set on first edit |
| `replyCount` | number | Denormalized reply count; auto-incremented |
| `createdAt` | ISO 8601 | Auto-managed |
| `updatedAt` | ISO 8601 | Auto-managed |

---

## General Error Responses

**`404` — Route not found**
```json
{
  "success": false,
  "message": "Route GET /api/unknown not found"
}
```

**`400` — Validation failed**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["text is required", "type must be one of: TEXT, SYSTEM"]
}
```
