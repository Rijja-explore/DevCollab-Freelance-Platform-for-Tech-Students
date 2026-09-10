# Database Design Documentation

## Overview

This document explains the MongoDB database design for the Workspace Service, including model structures, indexing strategies, and scalability considerations.

---

## Collections

### 1. Workspaces Collection

**Purpose:** Stores workspace information for project collaboration

```javascript
{
  _id: ObjectId,
  projectId: String,      // Unique business identifier
  studentId: String,      // Reference to external user service
  startupId: String,      // Reference to external organization service  
  status: String,         // ACTIVE | ARCHIVED
  createdAt: Date,
  updatedAt: Date
}
```

**Key Design Decisions:**
- `projectId` is the unique business identifier (not `_id`)
- String references for `studentId` and `startupId` for external service flexibility
- Status enum for workspace lifecycle management
- No embedded user/startup data to avoid data duplication

**Indexes:**
```javascript
{ projectId: 1 }                    // Unique index for business key
{ studentId: 1, status: 1 }         // Student's workspaces by status
{ startupId: 1, status: 1 }         // Startup's workspaces by status  
{ status: 1 }                       // Filter by status
{ createdAt: -1 }                   // Recent workspaces
```

---

### 2. Messages Collection

**Purpose:** Stores chat messages within workspaces

```javascript
{
  _id: ObjectId,
  workspaceId: ObjectId,  // Reference to Workspace
  senderId: String,       // Reference to external user service
  text: String,           // Message content (max 5000 chars)
  type: String,           // TEXT | SYSTEM
  deleted: Boolean,       // Soft delete flag
  edited: Boolean,        // Edit tracking
  editedAt: Date,         // Edit timestamp
  createdAt: Date,
  updatedAt: Date
}
```

**Key Design Decisions:**
- **Soft delete** with `deleted` flag instead of hard deletion for audit trail
- **Edit tracking** with `edited` flag and `editedAt` timestamp
- String `senderId` for external user service compatibility
- Message type enum for different message categories
- 5000 character limit for reasonable message size

**Indexes:**
```javascript
{ workspaceId: 1, createdAt: -1 }           // Primary: messages by workspace (time desc)
{ workspaceId: 1, deleted: 1, createdAt: -1 } // Non-deleted messages by workspace
{ senderId: 1, createdAt: -1 }              // Messages by sender
{ type: 1 }                                 // Filter by message type
{ createdAt: -1 }                          // Recent messages (global)
{ text: "text" }                           // Full-text search
```

**Most Critical Index:** `{ workspaceId: 1, createdAt: -1 }`
- **Why:** Messages are ALWAYS queried by workspace, ordered by time
- **Performance:** Supports efficient pagination and real-time message loading
- **Scalability:** Allows sharding by workspaceId in the future

---

### 3. Comments Collection

**Purpose:** Stores threaded comments on files within workspaces

```javascript
{
  _id: ObjectId,
  workspaceId: ObjectId,  // Reference to Workspace
  fileRef: String,        // File identifier (optional)
  lineNumber: Number,     // Line number (optional)
  authorId: String,       // Reference to external user service
  text: String,           // Comment content (max 10000 chars)
  parentId: ObjectId,     // Reference to parent Comment (null for top-level)
  deleted: Boolean,       // Soft delete flag
  edited: Boolean,        // Edit tracking
  editedAt: Date,         // Edit timestamp
  replyCount: Number,     // Cached reply count
  createdAt: Date,
  updatedAt: Date
}
```

**Key Design Decisions:**
- **Flat threading structure** with `parentId` references (not nested embedding)
- **Optional file association** via `fileRef` (supports workspace-wide comments)
- **Optional line-level comments** via `lineNumber`
- **Cached `replyCount`** for performance (denormalized data)
- Larger text limit (10000 chars) for detailed code review comments

**Indexes:**
```javascript
{ workspaceId: 1, fileRef: 1 }                    // Comments by file
{ workspaceId: 1, fileRef: 1, lineNumber: 1 }     // Comments by file + line
{ parentId: 1, createdAt: 1 }                     // Threaded replies
{ workspaceId: 1, parentId: 1, createdAt: -1 }    // Top-level comments
{ authorId: 1, createdAt: -1 }                    // Comments by author
{ workspaceId: 1, deleted: 1, createdAt: -1 }     // Non-deleted comments
{ text: "text" }                                  // Full-text search
```

**Most Critical Index:** `{ workspaceId: 1, fileRef: 1 }`
- **Why:** Comments are typically viewed by file within a workspace
- **Performance:** Efficient file-level comment loading
- **Use Case:** Code review workflows where comments are grouped by file

---

## Threading Strategy: References vs Embedding

### Why References Were Chosen

**For Comments (Threading):**
```javascript
// ✅ CHOSEN: Reference-based threading
{
  _id: "comment1",
  text: "Main comment",
  parentId: null
}
{
  _id: "comment2", 
  text: "Reply to main",
  parentId: "comment1"
}

// ❌ NOT CHOSEN: Embedded threading  
{
  _id: "comment1",
  text: "Main comment",
  replies: [
    { text: "Reply 1" },
    { text: "Reply 2", replies: [...] }  // Deep nesting problem
  ]
}
```

**Advantages of References:**
1. **Unlimited thread depth** without document size limits
2. **Independent reply operations** (add/edit/delete without affecting parent)
3. **Simpler indexing** (each comment is a separate document)
4. **Better scalability** (no risk of document size explosion)
5. **Easier to query** specific comments or reply chains

**Trade-offs:**
- Requires multiple queries for full thread (mitigated by proper indexing)
- Slightly more complex to reconstruct thread hierarchy

---

## Scalability Design

### For High-Volume Messaging (Millions of Messages)

**1. Efficient Indexing Strategy**
```javascript
// Primary index supports most common queries
{ workspaceId: 1, createdAt: -1 }

// Covers workspace message history with pagination
db.messages.find({ workspaceId: "workspace1" })
  .sort({ createdAt: -1 })
  .limit(50)
```

**2. Soft Delete for Performance**
- Deleted messages remain in collection for audit
- Filtered out via index: `{ workspaceId: 1, deleted: false, createdAt: -1 }`
- Periodic cleanup jobs can archive very old deleted messages

**3. Sharding Strategy (Future)**
```javascript
// Shard key: workspaceId
// - Each workspace's messages stay on same shard
// - Queries never need cross-shard operations
// - Natural scaling by workspace count
```

**4. Message Archival (Future)**
```javascript
// Archive messages older than 1 year
// Move to separate collection: messages_archive
// Keep indexes for archived data
```

### For High-Volume Comments

**1. File-Based Partitioning**
```javascript
// Index supports file-level queries efficiently
{ workspaceId: 1, fileRef: 1 }

// All comments for a file load in single query
db.comments.find({ 
  workspaceId: "workspace1", 
  fileRef: "src/auth.js" 
})
```

**2. Reply Count Caching**
```javascript
// Denormalized replyCount prevents counting queries
// Updated via middleware on comment create/delete
replyCount: 5  // Instead of db.comments.countDocuments({ parentId: commentId })
```

**3. Thread Depth Limiting (Future)**
```javascript
// Prevent infinite nesting with max depth validation
// Flatten deeply nested replies at UI level
```

---

## Performance Optimizations

### 1. Compound Indexes
Every query pattern has a supporting compound index:
- `(workspaceId, createdAt)` for message timelines
- `(workspaceId, fileRef)` for file comments
- `(parentId, createdAt)` for reply threading

### 2. Index Cardinality
- High cardinality first: `workspaceId` (many unique values)
- Low cardinality last: `status`, `type`, `deleted` (few unique values)

### 3. Query Patterns Supported
```javascript
// ✅ Efficient queries (covered by indexes)
messages.find({ workspaceId, deleted: false }).sort({ createdAt: -1 })
comments.find({ workspaceId, fileRef }).sort({ createdAt: 1 })
comments.find({ parentId }).sort({ createdAt: 1 })

// ❌ Avoid these patterns (require full collection scans)
messages.find({ text: /regex/ })  // Use text index instead
comments.find().sort({ replyCount: -1 })  // Not indexed
```

### 4. Text Search Optimization
```javascript
// Text indexes for search functionality
{ text: "text" }  // Both messages and comments

// Usage:
db.messages.find({ 
  workspaceId: "workspace1",
  $text: { $search: "authentication bug" }
}).sort({ score: { $meta: "textScore" } })
```

---

## Data Consistency

### 1. Referential Integrity
```javascript
// Comments reference workspaces
workspaceId: ObjectId  // Must exist in workspaces collection

// Comments can reference parent comments
parentId: ObjectId     // Must exist in comments collection (or null)
```

### 2. Cascade Operations
```javascript
// When workspace is deleted:
// - Archive all messages (set deleted: true)
// - Archive all comments (set deleted: true)
// - Don't hard delete for audit trail

// When comment is deleted:
// - Keep replies intact (orphaned replies policy)
// - Or cascade delete all replies (business decision)
```

### 3. Validation Rules
```javascript
// Workspace: projectId uniqueness enforced by index
// Message: workspaceId must exist
// Comment: parentId must exist (if not null)
// Comment: fileRef + lineNumber combination validation
```

---

## Security Considerations

### 1. Data Isolation
```javascript
// All queries MUST include workspaceId
// Prevents cross-workspace data leakage
db.messages.find({ workspaceId: userWorkspaceId, ... })
```

### 2. Input Validation
```javascript
// Text length limits
message.text: { maxlength: 5000 }
comment.text: { maxlength: 10000 }

// Reference format validation
projectId: /^[a-zA-Z0-9_-]+$/
```

### 3. Audit Trail
```javascript
// Soft deletes maintain audit trail
deleted: true, deletedAt: Date

// Edit history tracking
edited: true, editedAt: Date
```

---

## Migration Strategy

### Phase 1: Current Implementation
- Single MongoDB instance
- All collections in one database
- Indexes as specified above

### Phase 2: Scaling (Future)
```javascript
// Read replicas for query performance
// Primary: writes
// Secondaries: reads (message history, comment loading)
```

### Phase 3: Sharding (Future)
```javascript
// Shard key: workspaceId
// - Workspaces collection: shard by projectId
// - Messages collection: shard by workspaceId  
// - Comments collection: shard by workspaceId
```

### Phase 4: Archival (Future)
```javascript
// Time-based partitioning
// messages_2024, messages_2025, etc.
// Automated cleanup of old data
```

---

## Monitoring & Maintenance

### 1. Index Usage Monitoring
```javascript
// Monitor slow queries
db.setProfilingLevel(2, { slowms: 100 })

// Analyze index usage
db.messages.getIndexes()
db.messages.explain().find({ workspaceId: "..." })
```

### 2. Collection Stats
```javascript
// Monitor collection growth
db.messages.stats()
db.comments.stats()

// Track document sizes
db.messages.aggregate([
  { $project: { size: { $bsonSize: "$$ROOT" } } },
  { $group: { _id: null, avgSize: { $avg: "$size" } } }
])
```

### 3. Cleanup Jobs
```javascript
// Periodic cleanup of very old deleted messages
// Archive messages older than retention period
// Compact collections after bulk deletes
```

---

## Development Workflow

### 1. Model Usage
```javascript
// Import models
import { Workspace, Message, Comment } from '../models/index.js';

// Use static methods
const messages = await Message.findByWorkspace(workspaceId, 50);
const comments = await Comment.findByFile(workspaceId, 'src/auth.js');

// Use instance methods
await message.softDelete();
await comment.addReply({ authorId, text });
```

### 2. Seeding
```bash
# Run seed script
npm run seed

# Clears existing data and inserts sample data
# - 1 workspace
# - 5 messages  
# - 3 comments (with 1 threaded reply)
```

### 3. Testing
```javascript
// Test with realistic data volumes
// Seed 1000s of messages per workspace
// Verify query performance with explain()
// Test threading depth limits
```

This database design supports the requirements for a scalable collaboration platform while maintaining data consistency and query performance.