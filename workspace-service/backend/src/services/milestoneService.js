/**
 * Milestone Service
 *
 * Business logic for milestone operations.
 * The only operation currently exposed externally is completeMilestone,
 * which marks a milestone as completed and publishes the
 * milestone.completed RabbitMQ event.
 *
 * All other CRUD (create / list / get) is also provided so controllers
 * can be wired up without touching this file later.
 */

import { Milestone, Workspace } from '../models/index.js';
import { publishMilestoneCompleted } from '../messaging/publisher.js';
import { logger } from '../utils/logger.js';

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new milestone for a workspace.
 *
 * @param {string} workspaceId
 * @param {Object} data  { contractId, title, amount, studentId? }
 *   studentId is optional in the request body — if omitted it is copied from
 *   the workspace document so the event payload always has it.
 * @returns {{ success, data?, message?, statusCode? }}
 */
export const createMilestone = async (workspaceId, data) => {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }

    const milestone = new Milestone({
      workspaceId,
      projectId:  workspace.projectId,
      studentId:  data.studentId || workspace.studentId,
      contractId: data.contractId,
      title:      data.title,
      amount:     data.amount,
    });

    await milestone.save();

    logger.info(`Milestone created: ${milestone._id} for workspace ${workspaceId}`);
    return { success: true, data: milestone, statusCode: 201 };
  } catch (error) {
    logger.error('Error creating milestone:', error);
    return { success: false, message: 'Failed to create milestone', statusCode: 500 };
  }
};

// ── Get by workspace ──────────────────────────────────────────────────────────

/**
 * List all milestones for a workspace.
 */
export const getMilestonesByWorkspaceId = async (workspaceId) => {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }

    const milestones = await Milestone.findByWorkspace(workspaceId);
    return { success: true, data: milestones };
  } catch (error) {
    logger.error('Error fetching milestones:', error);
    return { success: false, message: 'Failed to retrieve milestones', statusCode: 500 };
  }
};

// ── Get single ────────────────────────────────────────────────────────────────

export const getMilestoneById = async (milestoneId) => {
  try {
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
      return { success: false, message: 'Milestone not found', statusCode: 404 };
    }
    return { success: true, data: milestone };
  } catch (error) {
    logger.error('Error fetching milestone:', error);
    return { success: false, message: 'Failed to retrieve milestone', statusCode: 500 };
  }
};

// ── Complete (core Phase-8 operation) ────────────────────────────────────────

/**
 * Mark a milestone as COMPLETED and publish milestone.completed to RabbitMQ.
 *
 * Rules:
 *   - Only a PENDING or IN_PROGRESS milestone may be completed.
 *   - The milestone.completed event is published AFTER the DB write succeeds.
 *   - A publish failure is logged but does NOT roll back the DB state —
 *     the milestone is still marked complete and the operator can republish
 *     manually or via the test script.
 *
 * @param {string} milestoneId
 * @param {string} userId          Authenticated user requesting completion.
 * @param {string} [completionNotes]
 * @returns {{ success, data?, message?, statusCode?, eventPublished? }}
 */
export const completeMilestone = async (milestoneId, userId, completionNotes = null) => {
  try {
    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      return { success: false, message: 'Milestone not found', statusCode: 404 };
    }

    if (milestone.isCompleted()) {
      return { success: false, message: 'Milestone is already completed', statusCode: 400 };
    }

    // Mark complete in DB
    await milestone.complete(completionNotes);

    logger.info(`Milestone ${milestoneId} marked COMPLETED by user ${userId}`);

    // Publish RabbitMQ event
    const eventPublished = publishMilestoneCompleted(milestone);

    if (!eventPublished) {
      logger.warn(
        `Milestone ${milestoneId} completed in DB but milestone.completed event could not be published — ` +
        'RabbitMQ channel may be unavailable. Re-publish manually when broker is back.'
      );
    }

    return { success: true, data: milestone, eventPublished };
  } catch (error) {
    logger.error('Error completing milestone:', error);
    return { success: false, message: 'Failed to complete milestone', statusCode: 500 };
  }
};

export default {
  createMilestone,
  getMilestonesByWorkspaceId,
  getMilestoneById,
  completeMilestone,
};
