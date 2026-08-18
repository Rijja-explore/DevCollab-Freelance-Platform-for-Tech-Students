# Workspace Service API Endpoints

## Phase 3 - REST API Implementation Complete ✅
## Phase 5 - Real-Time Communication Complete ✅

This document lists all implemented REST API endpoints and Socket.IO events for the Workspace Service.

---

## Base URL
```
http://localhost:5000/api
```

## Socket.IO URL
```
ws://localhost:5000
```

## Authentication

**Phase 4 - JWT Authentication (RS256)**

All REST API endpoints and Socket.IO connections require JWT authentication.

### REST API
Include JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Socket.IO
Provide JWT token during connection:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});
```

---

## Response Format

All endpoints return consistent JSON responses:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response  
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Workspace Endpoints

### 1. Get Workspace by ID
- **Endpoint:** `GET /api/workspaces/:id`
- **Description:** Retrieve a workspace by its workspace ID
- **Parameters:**
  - `id` (string, required) - Workspace ObjectId
- **Validation:**
  - Validates ObjectId format
- **Response Codes:**
  - `200` - Success
  - `400` - Invalid workspace ID format
  - `404` - Workspace not found
  - `500` - Server error

**Example:**
```bash
GET /api/workspaces/507f1f77bcf86cd799439011
```

### 2. Get Workspace by Project ID
- **Endpoint:** `GET /api/workspaces/project/:projectId`
- **Description:** Retrieve a workspace by its project ID
- **Parameters:**
  - `projectId` (string, required) - Project identifier
- **Validation:**
  - Must contain only letters, numbers, hyphens, underscores
  - Cannot be empty
- **Response Codes:**
  - `200` - Success
  - `400` - Invalid project ID format
  - `404` - Workspace not found
  - `500` - Server error

**Example:**
```bash
GET /api/workspaces/project/proj-collab-workspace-2024
```

---

## Message Endpoints

### 3. Get Messages for Workspace
- **Endpoint:** `GET /api/workspaces/:workspaceId/messages`
- **Description:** Retrieve all non-deleted messages for a workspace
- **Parameters:**
  - `workspaceId` (string, required) - Workspace ObjectId
- **Sorting:** Messages sorted oldest to newest (createdAt ascending)
- **Validation:**
  - Validates workspace ObjectId format
- **Response Codes:**
  - `200` - Success
  - `400` - Invalid workspace ID
  - `404` - Workspace not found
  - `500` - Server error

**Example:**
```bash
GET /api/workspaces/507f1f77bcf86cd799439011/messages
```

### 4. Create Message
- **Endpoint:** `POST /api/workspaces/:workspaceId/messages`
- **Description:** Create a new message in a workspace
- **Parameters:**
  - `workspaceId` (string, required) - Workspace ObjectId
- **Request Body:**
```json
{
  "senderId": "string (required, 1-50 chars)",
  "text": "string (required, 1-5000 chars)", 
  "type": "string (optional, TEXT|SYSTEM, default: TEXT)"
}
```
- **Validation:**
  - Validates all required fields
  - Checks text length limits
  - Validates enum values
- **Response Codes:**
  - `201` - Created successfully
  - `400` - Validation error
  - `404` - Workspace not found
  - `500` - Server error

### 5. Edit Message
- **Endpoint:** `PUT /api/messages/:messageId`
- **Description:** Edit message content only
- **Parameters:**
  - `messageId` (string, required) - Message ObjectId
- **Request Body:**
```json
{
  "text": "string (required, 1-5000 chars)"
}
```
- **Validation:**
  - Validates message ID format
  - Validates text content
- **Response Codes:**
  - `200` - Updated successfully
  - `400` - Validation error or message already deleted
  - `404` - Message not found
  - `500` - Server error

### 6. Delete Message
- **Endpoint:** `DELETE /api/messages/:messageId`
- **Description:** Soft delete a message (marks as deleted, preserves data)
- **Parameters:**
  - `messageId` (string, required) - Message ObjectId
- **Validation:**
  - Validates message ID format
- **Response Codes:**
  - `200` - Deleted successfully
  - `400` - Message already deleted
  - `404` - Message not found
  - `500` - Server error

---

## Comment Endpoints

### 7. Get Comments for Workspace
- **Endpoint:** `GET /api/workspaces/:workspaceId/comments`
- **Description:** Retrieve comments with nested replies for a workspace
- **Parameters:**
  - `workspaceId` (string, required) - Workspace ObjectId
- **Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment_id",
      "text": "Comment text",
      "authorId": "author_id",
      "fileRef": "file_path",
      "lineNumber": 42,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "replies": [
        {
          "id": "reply_id", 
          "text": "Reply text",
          "authorId": "reply_author_id",
          "parentId": "comment_id",
          "createdAt": "2024-01-01T01:00:00.000Z"
        }
      ]
    }
  ]
}
```
- **Sorting:**
  - Top-level comments: Newest first
  - Replies: Oldest first
- **Response Codes:**
  - `200` - Success
  - `400` - Invalid workspace ID
  - `404` - Workspace not found
  - `500` - Server error

### 8. Create Comment
- **Endpoint:** `POST /api/workspaces/:workspaceId/comments`
- **Description:** Create a new top-level comment
- **Parameters:**
  - `workspaceId` (string, required) - Workspace ObjectId
- **Request Body:**
```json
{
  "authorId": "string (required, 1-50 chars)",
  "text": "string (required, 1-10000 chars)",
  "fileRef": "string (optional, max 500 chars)",
  "lineNumber": "number (optional, min 1, max 1000000)"
}
```
- **Validation:**
  - Validates all field lengths and formats
  - fileRef and lineNumber are optional
- **Response Codes:**
  - `201` - Created successfully
  - `400` - Validation error
  - `404` - Workspace not found
  - `500` - Server error

### 9. Create Reply
- **Endpoint:** `POST /api/comments/:commentId/reply`
- **Description:** Create a reply to an existing comment
- **Parameters:**
  - `commentId` (string, required) - Parent comment ObjectId
- **Request Body:**
```json
{
  "authorId": "string (required, 1-50 chars)",
  "text": "string (required, 1-10000 chars)"
}
```
- **Validation:**
  - Validates comment ID format
  - Validates required fields
- **Business Rules:**
  - Cannot reply to deleted comments
  - Inherits workspace and file context from parent
- **Response Codes:**
  - `201` - Created successfully
  - `400` - Validation error or parent comment deleted
  - `404` - Parent comment not found
  - `500` - Server error

### 10. Edit Comment
- **Endpoint:** `PUT /api/comments/:commentId`
- **Description:** Edit comment content only
- **Parameters:**
  - `commentId` (string, required) - Comment ObjectId
- **Request Body:**
```json
{
  "text": "string (required, 1-10000 chars)"
}
```
- **Response Codes:**
  - `200` - Updated successfully
  - `400` - Validation error or comment already deleted
  - `404` - Comment not found
  - `500` - Server error

### 11. Delete Comment
- **Endpoint:** `DELETE /api/comments/:commentId`
- **Description:** Soft delete a comment (marks as deleted, preserves data)
- **Parameters:**
  - `commentId` (string, required) - Comment ObjectId
- **Response Codes:**
  - `200` - Deleted successfully
  - `400` - Comment already deleted
  - `404` - Comment not found
  - `500` - Server error

---

## Health Check

### 12. Health Status
- **Endpoint:** `GET /health`
- **Description:** Check service health status
- **No Authentication Required**
- **Response:**
```json
{
  "status": "running",
  "service": "Workspace Service", 
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "senderId is required",
    "text must be at least 1 character"
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Workspace not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to retrieve workspace"
}
```

---

## Implementation Notes

### Validation Rules
- **ObjectIds:** Validated using mongoose.Types.ObjectId.isValid()
- **String Fields:** Trimmed and checked for empty content
- **Enum Fields:** Validated against predefined constants
- **Number Fields:** Range validation where applicable

### Business Rules
- **Soft Delete:** All delete operations use soft delete (deleted: true)
- **Workspace Isolation:** All operations require valid workspace context
- **Threading:** Comments use flat reference structure with parentId
- **Edit Tracking:** Messages and comments track edit status and timestamp

### Data Consistency
- **Workspace Verification:** All operations verify workspace exists first
- **Reference Integrity:** Parent comments must exist and be non-deleted for replies
- **Audit Trail:** Soft deletes preserve data for audit purposes

This completes the REST API implementation for Phase 3 of the Workspace Service.

---

## Socket.IO Real-Time Events (Phase 5)

### Connection

**Endpoint:** `ws://localhost:5000`

**Authentication:** JWT token required via `auth.token`

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});
```

### Client → Server Events

#### Join Workspace
**Event:** `join-workspace`

**Payload:**
```json
{
  "workspaceId": "string (required, valid ObjectId)"
}
```

**Response Event:** `joined-workspace`
```json
{
  "workspaceId": "workspace-id",
  "room": "workspace_workspace-id",
  "message": "Successfully joined workspace"
}
```

**Errors:**
- Workspace ID required
- Invalid workspace ID format

---

#### Leave Workspace
**Event:** `leave-workspace`

**Payload:**
```json
{
  "workspaceId": "string (required, valid ObjectId)"
}
```

**Response Event:** `left-workspace`
```json
{
  "workspaceId": "workspace-id",
  "room": "workspace_workspace-id",
  "message": "Successfully left workspace"
}
```

---

### Server → Client Events

All events are broadcast only to users in the same workspace room.

#### Message Created
**Event:** `message-created`

**Triggered by:** `POST /api/workspaces/:workspaceId/messages`

**Payload:**
```json
{
  "_id": "string",
  "workspaceId": "string",
  "senderId": "string",
  "text": "string",
  "type": "TEXT|SYSTEM",
  "deleted": false,
  "isEdited": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

#### Message Updated
**Event:** `message-updated`

**Triggered by:** `PUT /api/messages/:messageId`

**Payload:**
```json
{
  "_id": "string",
  "workspaceId": "string",
  "senderId": "string",
  "text": "string (updated)",
  "type": "TEXT|SYSTEM",
  "deleted": false,
  "isEdited": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

#### Message Deleted
**Event:** `message-deleted`

**Triggered by:** `DELETE /api/messages/:messageId`

**Payload:**
```json
{
  "messageId": "string"
}
```

---

#### Comment Created
**Event:** `comment-created`

**Triggered by:** 
- `POST /api/workspaces/:workspaceId/comments`
- `POST /api/comments/:commentId/reply`

**Payload:**
```json
{
  "_id": "string",
  "workspaceId": "string",
  "authorId": "string",
  "text": "string",
  "parentId": "string|null",
  "fileRef": "string (optional)",
  "lineNumber": "number (optional)",
  "deleted": false,
  "isEdited": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

#### Comment Updated
**Event:** `comment-updated`

**Triggered by:** `PUT /api/comments/:commentId`

**Payload:**
```json
{
  "_id": "string",
  "workspaceId": "string",
  "authorId": "string",
  "text": "string (updated)",
  "parentId": "string|null",
  "fileRef": "string (optional)",
  "lineNumber": "number (optional)",
  "deleted": false,
  "isEdited": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

#### Comment Deleted
**Event:** `comment-deleted`

**Triggered by:** `DELETE /api/comments/:commentId`

**Payload:**
```json
{
  "commentId": "string"
}
```

---

### Socket.IO Error Events

#### Error
**Event:** `error`

**Triggered by:** Invalid operations, validation failures

**Payload:**
```json
{
  "message": "Error description"
}
```

#### Connect Error
**Event:** `connect_error`

**Triggered by:** Authentication failure, connection issues

**Example:**
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Possible causes:
  // - Invalid JWT token
  // - Expired token
  // - Missing token
  // - Network issues
});
```

---

### Real-Time Flow Example

1. **Client connects and joins workspace:**
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: jwtToken }
});

socket.on('connect', () => {
  socket.emit('join-workspace', { workspaceId: 'abc123' });
});

socket.on('joined-workspace', (data) => {
  console.log('Joined workspace:', data.workspaceId);
});
```

2. **Client A creates a message via REST API:**
```bash
POST /api/workspaces/abc123/messages
{
  "senderId": "user1",
  "text": "Hello world"
}
```

3. **All clients in workspace receive real-time event:**
```javascript
socket.on('message-created', (message) => {
  // Update UI with new message
  addMessageToUI(message);
});
```

4. **Client B updates the message via REST API:**
```bash
PUT /api/messages/msg456
{
  "text": "Hello world (edited)"
}
```

5. **All clients receive update event:**
```javascript
socket.on('message-updated', (message) => {
  // Update UI with edited message
  updateMessageInUI(message);
});
```

---

### Room Isolation

- Each workspace has its own Socket.IO room: `workspace_<workspaceId>`
- Events are broadcast only to users in the same room
- Users must join a workspace to receive its events
- Users can join multiple workspaces simultaneously

---

### Quick Start

See `SOCKET_QUICK_START.md` for complete client integration examples.

For detailed Socket.IO implementation documentation, see `PHASE5_SOCKET_IMPLEMENTATION.md`.