import mongoose from 'mongoose';
import { WORKSPACE_STATUS_VALUES, DEFAULT_WORKSPACE_STATUS } from './constants.js';

const { Schema } = mongoose;

/**
 * Workspace Model
 * 
 * Represents a collaborative workspace for a specific project.
 * Each workspace is uniquely identified by projectId and contains
 * all related messages, comments, and collaboration data.
 * 
 * Design Decisions:
 * - projectId is unique across the entire system
 * - References to studentId and startupId instead of embedding for normalization
 * - Status enum for workspace lifecycle management
 * - Timestamps for audit trail and sorting
 */

const workspaceSchema = new Schema({
  // Unique project identifier - primary business key
  projectId: {
    type: String,
    required: [true, 'Project ID is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Project ID cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        // Basic validation for project ID format (alphanumeric + hyphens/underscores)
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Project ID must contain only letters, numbers, hyphens, and underscores'
    }
  },

  // Student associated with this workspace
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    trim: true,
    maxlength: [50, 'Student ID cannot exceed 50 characters']
  },

  // Startup associated with this workspace
  startupId: {
    type: String,
    required: [true, 'Startup ID is required'],
    trim: true,
    maxlength: [50, 'Startup ID cannot exceed 50 characters']
  },

  // Project name for display purposes (denormalized from Discovery Service)
  projectName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [255, 'Project name cannot exceed 255 characters'],
    default: 'Project'
  },

  // Workspace lifecycle status
  status: {
    type: String,
    enum: {
      values: WORKSPACE_STATUS_VALUES,
      message: 'Status must be one of: {VALUES}'
    },
    default: DEFAULT_WORKSPACE_STATUS,
    required: true
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
// Primary unique index on projectId for fast lookups and uniqueness enforcement
workspaceSchema.index({ projectId: 1 }, { unique: true });

// Composite index for queries by student and status
workspaceSchema.index({ studentId: 1, status: 1 });

// Composite index for queries by startup and status  
workspaceSchema.index({ startupId: 1, status: 1 });

// Index for status filtering (e.g., find all active workspaces)
workspaceSchema.index({ status: 1 });

// Index for recent workspaces (most commonly needed query)
workspaceSchema.index({ createdAt: -1 });

// STATIC METHODS
/**
 * Find workspace by project ID
 */
workspaceSchema.statics.findByProjectId = function(projectId) {
  return this.findOne({ projectId });
};

/**
 * Find active workspaces for a student
 */
workspaceSchema.statics.findActiveByStudent = function(studentId) {
  return this.find({ studentId, status: 'ACTIVE' }).sort({ createdAt: -1 });
};

/**
 * Find active workspaces for a startup
 */
workspaceSchema.statics.findActiveByStartup = function(startupId) {
  return this.find({ startupId, status: 'ACTIVE' }).sort({ createdAt: -1 });
};

// INSTANCE METHODS
/**
 * Archive this workspace
 */
workspaceSchema.methods.archive = function() {
  this.status = 'ARCHIVED';
  return this.save();
};

/**
 * Activate this workspace
 */
workspaceSchema.methods.activate = function() {
  this.status = 'ACTIVE';
  return this.save();
};

/**
 * Check if workspace is active
 */
workspaceSchema.methods.isActive = function() {
  return this.status === 'ACTIVE';
};

// PRE-SAVE MIDDLEWARE
workspaceSchema.pre('save', function(next) {
  // Convert projectId to lowercase for consistency
  if (this.isModified('projectId')) {
    this.projectId = this.projectId.toLowerCase();
  }
  next();
});

// Export the model
export default mongoose.model('Workspace', workspaceSchema);