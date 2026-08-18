/**
 * Milestone Controller
 *
 * Thin HTTP layer — delegates entirely to milestoneService.
 *
 * Endpoints:
 *   GET  /api/workspaces/:workspaceId/milestones          list
 *   POST /api/workspaces/:workspaceId/milestones          create
 *   GET  /api/milestones/:milestoneId                     get single
 *   POST /api/milestones/:milestoneId/complete            mark complete + publish event
 */

import milestoneService from '../services/milestoneService.js';
import { logger } from '../utils/logger.js';

// ── List ──────────────────────────────────────────────────────────────────────

export const getMilestones = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    logger.info(`Listing milestones for workspace: ${workspaceId}`);

    const result = await milestoneService.getMilestonesByWorkspaceId(workspaceId);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ success: false, message: result.message });
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
};

// ── Create ────────────────────────────────────────────────────────────────────

export const createMilestone = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    logger.info(`Creating milestone in workspace: ${workspaceId} by user: ${req.user.id}`);

    const result = await milestoneService.createMilestone(workspaceId, req.body);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ success: false, message: result.message });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
};

// ── Get single ────────────────────────────────────────────────────────────────

export const getMilestoneById = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    logger.info(`Getting milestone: ${milestoneId}`);

    const result = await milestoneService.getMilestoneById(milestoneId);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ success: false, message: result.message });
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
};

// ── Complete ──────────────────────────────────────────────────────────────────

/**
 * POST /api/milestones/:milestoneId/complete
 *
 * Marks the milestone as COMPLETED and publishes the milestone.completed
 * RabbitMQ event so Person C can release the escrow payment.
 *
 * Request body (optional):
 *   { "completionNotes": "All deliverables submitted." }
 */
export const completeMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { completionNotes } = req.body || {};
    const userId = req.user.id;

    logger.info(`Completing milestone: ${milestoneId} by user: ${userId}`);

    const result = await milestoneService.completeMilestone(milestoneId, userId, completionNotes);

    if (!result.success) {
      return res.status(result.statusCode || 500).json({ success: false, message: result.message });
    }

    res.json({
      success:        true,
      data:           result.data,
      eventPublished: result.eventPublished,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getMilestones,
  createMilestone,
  getMilestoneById,
  completeMilestone,
};
