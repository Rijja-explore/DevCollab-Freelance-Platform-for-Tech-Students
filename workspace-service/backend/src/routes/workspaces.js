/**
 * Workspace Routes
 * 
 * Defines workspace-related API endpoints.
 * Maps routes to controllers with validation middleware.
 */

import express from 'express';
import workspaceController from '../controllers/workspaceController.js';
import { workspaceValidator } from '../validators/index.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/workspaces/:id
 * Get workspace by workspace ID
 * Requires authentication
 */
router.get(
  '/:id',
  authenticate,
  workspaceValidator.validateWorkspaceId,
  workspaceController.getWorkspaceById
);

/**
 * GET /api/workspaces/project/:projectId  
 * Get workspace by project ID
 * Requires authentication
 */
router.get(
  '/project/:projectId',
  authenticate,
  workspaceValidator.validateProjectId,
  workspaceController.getWorkspaceByProjectId
);

export default router;
