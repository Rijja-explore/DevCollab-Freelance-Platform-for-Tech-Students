import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Comment Model
 * 
 * Represents threaded comments on files within a workspace.
 * Supports file-level and line-level commenting with threading.
 * 
 * Design Decisions:
 * - Uses references for threading (parentId) instead of embedding for scalability
 * - Supports both file-level comments (no lineNumber) and line-specific comments
 * - workspaceId for workspace isolation
 * - fileRef for file association (could be file path, file ID, etc.)
 * - Flat structure with parentId for threading - avoids deep nesting complexity
 * - authorId as string reference for external user service compatibility
 */

const commentSchema = new Schema({
  // Reference to the workspace this comment belongs to
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required'],
    index: true
  },

  // File reference - could be file path, file ID, or any file identifier
  fileRef: {
    type: String,
    trim: true,
    maxlength: [500, 'File reference cannot exceed 500 characters'],
    index: true,
    // Optional - comments can be workspace-wide or file-specific
  },

  // Specific line number in the file (optional)
  lineNumber: {
    type: Number,
    min: [1, 'Line number must be positive'],
    max: [1000000, 'Line number too large'],
    // Optional - for line-specific comments
  },

  // User who authored this comment (external user service ID)
  authorId: {
    type: String,
    required: [true, 'Author ID is required'],
    trim: true,
    maxlength: [50, 'Author ID cannot exceed 50 characters']
  },

  // Comment content
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [10000, 'Comment cannot exceed 10000 characters'],
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Comment cannot be empty'
    }
  },

  // Parent comment for threading (null for top-level comments)
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },

  // Soft delete flag
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // Edit tracking
  edited: {
    type: Boolean,
    default: false
  },

  // Edit timestamp
  editedAt: {
    type: Date,
    default: null
  },

  // Cache reply count for performance (denormalized)
  replyCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  // Enable automatic timestamps
  timestamps: true,
  
  // Optimize JSON output
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  
  // Optimize Object output
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// INDEXES
// Primary compound index: workspace + file (most common query pattern)
commentSchema.index({ workspaceId: 1, fileRef: 1 });

// Index for file + line comments
commentSchema.index({ workspaceId: 1, fileRef: 1, lineNumber: 1 });

// Index for threaded comments (find replies to a comment)
commentSchema.index({ parentId: 1, createdAt: 1 });

// Index for author-based queries
commentSchema.index({ authorId: 1, createdAt: -1 });

// Compound index for non-deleted comments in workspace
commentSchema.index({ workspaceId: 1, deleted: 1, createdAt: -1 });

// Index for top-level comments (parentId is null)
commentSchema.index({ workspaceId: 1, parentId: 1, createdAt: -1 });

// Index for recent comments across workspaces
commentSchema.index({ createdAt: -1 });

// STATIC METHODS
/**
 * Find comments for a specific file
 */
commentSchema.statics.findByFile = function(workspaceId, fileRef, includeDeleted = false) {
  const query = { workspaceId, fileRef };
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.find(query).sort({ createdAt: 1 });
};

/**
 * Find comments for a specific line in a file
 */
commentSchema.statics.findByFileLine = function(workspaceId, fileRef, lineNumber, includeDeleted = false) {
  const query = { workspaceId, fileRef, lineNumber };
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.find(query).sort({ createdAt: 1 });
};

/**
 * Find top-level comments (no parent) for a workspace or file
 */
commentSchema.statics.findTopLevel = function(workspaceId, fileRef = null, includeDeleted = false) {
  const query = { workspaceId, parentId: null };
  if (fileRef) {
    query.fileRef = fileRef;
  }
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find replies to a specific comment
 */
commentSchema.statics.findReplies = function(parentId, includeDeleted = false) {
  const query = { parentId };
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.find(query).sort({ createdAt: 1 });
};

/**
 * Find comments by author in workspace
 */
commentSchema.statics.findByAuthor = function(workspaceId, authorId, includeDeleted = false) {
  const query = { workspaceId, authorId };
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get comment thread (comment + all nested replies)
 */
commentSchema.statics.getThread = async function(commentId, includeDeleted = false) {
  const rootComment = await this.findById(commentId);
  if (!rootComment || (rootComment.deleted && !includeDeleted)) {
    return null;
  }

  const allReplies = await this.findReplies(commentId, includeDeleted);
  
  return {
    comment: rootComment,
    replies: allReplies
  };
};

// INSTANCE METHODS
/**
 * Soft delete this comment
 */
commentSchema.methods.softDelete = function() {
  this.deleted = true;
  return this.save();
};

/**
 * Edit this comment
 */
commentSchema.methods.edit = function(newText) {
  this.text = newText;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

/**
 * Add a reply to this comment
 */
commentSchema.methods.addReply = async function(replyData) {
  replyData.parentId = this._id;
  replyData.workspaceId = this.workspaceId;
  
  // If this is a file comment, inherit file reference
  if (this.fileRef) {
    replyData.fileRef = this.fileRef;
  }
  
  const Comment = this.constructor;
  const reply = new Comment(replyData);
  await reply.save();
  
  // Increment reply count
  this.replyCount += 1;
  await this.save();
  
  return reply;
};

/**
 * Check if this is a top-level comment
 */
commentSchema.methods.isTopLevel = function() {
  return !this.parentId;
};

/**
 * Check if this is a reply
 */
commentSchema.methods.isReply = function() {
  return !!this.parentId;
};

/**
 * Get the root comment of this thread
 */
commentSchema.methods.getRootComment = async function() {
  if (this.isTopLevel()) {
    return this;
  }
  
  const Comment = this.constructor;
  let current = this;
  
  while (current.parentId) {
    current = await Comment.findById(current.parentId);
    if (!current) break;
  }
  
  return current;
};

// PRE-SAVE MIDDLEWARE
commentSchema.pre('save', function(next) {
  // Trim whitespace from text
  if (this.isModified('text')) {
    this.text = this.text.trim();
  }
  next();
});

// POST-SAVE MIDDLEWARE (update parent reply count)
commentSchema.post('save', async function(doc) {
  // If this is a new reply, increment parent's reply count
  if (doc.parentId && doc.isNew) {
    await this.constructor.findByIdAndUpdate(
      doc.parentId, 
      { $inc: { replyCount: 1 } }
    );
  }
});

// POST-DELETE MIDDLEWARE (decrement parent reply count)
commentSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.parentId) {
    await this.model.findByIdAndUpdate(
      doc.parentId,
      { $inc: { replyCount: -1 } }
    );
  }
});

// TEXT INDEX for search functionality
commentSchema.index({ text: 'text' });

// Export the model
export default mongoose.model('Comment', commentSchema);