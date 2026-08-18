/**
 * Milestone Routes
 *
 * GET  /api/workspaces/:workspaceId/milestones         list milestones in a workspace
 * POST /api/workspaces/:workspaceId/milestones         create a milestone
 * GET  /api/milestones/:milestoneId                    get single milestone
 * POST /api/milestones/:milestoneId/complete           mark complete → publishes milestone.completed
 *
 * All endpoints require JWT authentication.
 * The complete endpoint is the RabbitMQ publish trigger — it is the only
 * way to produce a milestone.completed event; no direct RabbitMQ access
 * is exposed to the frontend.
 */

import express from 'express';
import milestoneController from '../controllers/milestoneController.js';
import milestoneValidator  from '../validators/milestoneValidator.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Workspace-scoped ──────────────────────────────────────────────────────────

router.get(
  '/workspaces/:workspaceId/milestones',
  authenticate,
  milestoneValidator.validateWorkspaceIdParam,
  milestoneController.getMilestones
);

router.post(
  '/workspaces/:workspaceId/milestones',
  authenticate,
  milestoneValidator.validateWorkspaceIdParam,
  milestoneValidator.validateCreateMilestone,
  milestoneController.createMilestone
);

// ── Milestone-scoped ──────────────────────────────────────────────────────────

router.get(
  '/milestones/:milestoneId',
  authenticate,
  milestoneValidator.validateMilestoneIdParam,
  milestoneController.getMilestoneById
);

router.post(
  '/milestones/:milestoneId/complete',
  authenticate,
  milestoneValidator.validateMilestoneIdParam,
  milestoneValidator.validateCompleteMilestone,
  milestoneController.completeMilestone
);

export default router;
