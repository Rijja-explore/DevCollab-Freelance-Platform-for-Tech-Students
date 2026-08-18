import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Milestone Model
 *
 * Tracks milestones associated with a workspace / project.
 * Created by the Workspace Service when a milestone is marked complete
 * so the milestone.completed RabbitMQ event can carry real data.
 *
 * Design decisions:
 * - Minimal schema — only what's needed for the event contract with Person C.
 * - workspaceId links back to the Workspace model.
 * - contractId is an opaque string from the external contract system.
 * - studentId/startupId are denormalised from the workspace for convenience
 *   (avoids a second lookup when building the event payload).
 * - status enum: PENDING → IN_PROGRESS → COMPLETED.
 * - amount is the payment value Person C will release.
 */

export const MILESTONE_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

const milestoneSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },

    // Opaque project identifier (matches workspace.projectId)
    projectId: {
      type: String,
      required: [true, 'Project ID is required'],
      trim: true,
      maxlength: [100, 'Project ID cannot exceed 100 characters'],
      index: true,
    },

    // Contract identifier supplied by Person C's payment/contract system
    contractId: {
      type: String,
      required: [true, 'Contract ID is required'],
      trim: true,
      maxlength: [100, 'Contract ID cannot exceed 100 characters'],
      index: true,
    },

    // Student associated with this milestone (copied from workspace)
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true,
      maxlength: [50, 'Student ID cannot exceed 50 characters'],
    },

    // Human-readable milestone title
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    // Payment amount that will be released on completion
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(MILESTONE_STATUS),
        message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED',
      },
      default: MILESTONE_STATUS.PENDING,
      required: true,
      index: true,
    },

    // Populated when status transitions to COMPLETED
    completedAt: {
      type: Date,
      default: null,
    },

    // Optional notes written at completion time (included in the RabbitMQ event)
    completionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Completion notes cannot exceed 2000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

milestoneSchema.index({ workspaceId: 1, status: 1 });
milestoneSchema.index({ contractId: 1, status: 1 });
milestoneSchema.index({ createdAt: -1 });

// ── Static helpers ────────────────────────────────────────────────────────────

milestoneSchema.statics.findByWorkspace = function (workspaceId) {
  return this.find({ workspaceId }).sort({ createdAt: -1 });
};

milestoneSchema.statics.findByContractId = function (contractId) {
  return this.find({ contractId }).sort({ createdAt: -1 });
};

// ── Instance methods ──────────────────────────────────────────────────────────

milestoneSchema.methods.complete = function (notes = null) {
  this.status = MILESTONE_STATUS.COMPLETED;
  this.completedAt = new Date();
  if (notes) this.completionNotes = notes;
  return this.save();
};

milestoneSchema.methods.isCompleted = function () {
  return this.status === MILESTONE_STATUS.COMPLETED;
};

export default mongoose.model('Milestone', milestoneSchema);
