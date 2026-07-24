# Workspace Service API Endpoints

## Phase 3 - REST API Implementation Complete ✅

This document lists all implemented REST API endpoints for the Workspace Service.

---

## Base URL
```
http://localhost:5000/api
```

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