import mongoose from 'mongoose';
import { MESSAGE_TYPE_VALUES, DEFAULT_MESSAGE_TYPE } from './constants.js';

const { Schema } = mongoose;

/**
 * Message Model
 * 
 * Represents chat messages within a workspace.
 * Designed for high-volume messaging with efficient queries.
 * 
 * Design Decisions:
 * - workspaceId as reference for workspace isolation
 * - senderId as string reference (not ObjectId) for flexibility with external user services
 * - Soft delete with 'deleted' flag instead of hard deletion for audit trail
 * - Edit flag for message modification tracking
 * - Compound index (workspaceId, createdAt) for efficient message history queries
 * - No embedded replies - use Comment model for threaded discussions
 */

const messageSchema = new Schema({
  // Reference to the workspace this message belongs to
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required'],
    index: true
  },

  // User who sent this message (external user service ID)
  senderId: {
    type: String,
    required: [true, 'Sender ID is required'],
    trim: true,
    maxlength: [50, 'Sender ID cannot exceed 50 characters']
  },

  // Message content
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Message cannot be empty'
    }
  },

  // Message type for different kinds of messages
  type: {
    type: String,
    enum: {
      values: MESSAGE_TYPE_VALUES,
      message: 'Message type must be one of: {VALUES}'
    },
    default: DEFAULT_MESSAGE_TYPE,
    required: true
  },

  // Soft delete flag - preserves message in history but marks as deleted
  deleted: {
    type: Boolean,
    default: false,
    index: true  // Index for filtering out deleted messages
  },

  // Edit tracking - marks if message has been modified
  edited: {
    type: Boolean,
    default: false
  },

  // Store edit timestamp separately from updatedAt for clarity
  editedAt: {
    type: Date,
    default: null
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
// Primary compound index: workspace + time (most common query pattern)
// Messages are always queried by workspace, ordered by time
messageSchema.index({ workspaceId: 1, createdAt: -1 });

// Index for sender-based queries (find messages by user)
messageSchema.index({ senderId: 1, createdAt: -1 });

// Index for message type filtering
messageSchema.index({ type: 1 });

// Compound index for non-deleted messages in workspace (common filter)
messageSchema.index({ workspaceId: 1, deleted: 1, createdAt: -1 });

// Index for recent messages across all workspaces (admin/monitoring queries)
messageSchema.index({ createdAt: -1 });

// STATIC METHODS
/**
 * Find recent messages in a workspace (excluding deleted)
 */
messageSchema.statics.findByWorkspace = function(workspaceId, limit = 50, before = null) {
  const query = { workspaceId, deleted: false };
  
  // If 'before' timestamp provided, get messages before that time (pagination)
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('workspaceId', 'projectId');
};

/**
 * Find messages by sender in a workspace
 */
messageSchema.statics.findBySender = function(workspaceId, senderId, limit = 50) {
  return this.find({ 
    workspaceId, 
    senderId, 
    deleted: false 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

/**
 * Get message count for a workspace
 */
messageSchema.statics.getCountByWorkspace = function(workspaceId, includeDeleted = false) {
  const query = { workspaceId };
  if (!includeDeleted) {
    query.deleted = false;
  }
  return this.countDocuments(query);
};

/**
 * Search messages in workspace by text
 */
messageSchema.statics.searchInWorkspace = function(workspaceId, searchText, limit = 20) {
  return this.find({
    workspaceId,
    deleted: false,
    $text: { $search: searchText }
  })
  .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
  .limit(limit);
};

// INSTANCE METHODS
/**
 * Soft delete this message
 */
messageSchema.methods.softDelete = function() {
  this.deleted = true;
  return this.save();
};

/**
 * Edit this message
 */
messageSchema.methods.edit = function(newText) {
  this.text = newText;
  this.edited = true;
  this.editedAt = new Date();
  return this.save();
};

/**
 * Check if message is deleted
 */
messageSchema.methods.isDeleted = function() {
  return this.deleted;
};

/**
 * Check if message was edited
 */
messageSchema.methods.wasEdited = function() {
  return this.edited;
};

// PRE-SAVE MIDDLEWARE
messageSchema.pre('save', function(next) {
  // Trim whitespace from text
  if (this.isModified('text')) {
    this.text = this.text.trim();
  }
  next();
});

// TEXT INDEX for search functionality
messageSchema.index({ text: 'text' });

// Export the model
export default mongoose.model('Message', messageSchema);