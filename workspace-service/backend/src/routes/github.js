/**
 * GitHub Code Review Routes
 *
 * All routes are scoped under:
 *   /api/workspaces/:workspaceId/github/...
 *
 * Routing conventions mirror the existing milestones router:
 *  - Workspace-scoped prefix with :workspaceId in path
 *  - authenticate middleware on every route (same import as other routers)
 *  - Thin router — no business logic here, delegates to githubController
 *
 * GET    /api/workspaces/:workspaceId/github/repo         repo info / link status
 * PUT    /api/workspaces/:workspaceId/github/repo         link a repository
 * GET    /api/workspaces/:workspaceId/github/files        list files at ?path=
 * GET    /api/workspaces/:workspaceId/github/file         get file content at ?path=
 * POST   /api/workspaces/:workspaceId/github/file         create a new file
 * PUT    /api/workspaces/:workspaceId/github/file         update an existing file
 */

import express from 'express';
import githubController from '../controllers/githubController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Repository linking ────────────────────────────────────────────────────────

router.get(
  '/workspaces/:workspaceId/github/repo',
  authenticate,
  githubController.getRepo
);

router.put(
  '/workspaces/:workspaceId/github/repo',
  authenticate,
  githubController.linkRepo
);

// ── File tree ─────────────────────────────────────────────────────────────────

router.get(
  '/workspaces/:workspaceId/github/files',
  authenticate,
  githubController.listFiles
);

// ── File content / create / update ───────────────────────────────────────────

router.get(
  '/workspaces/:workspaceId/github/file',
  authenticate,
  githubController.getFile
);

router.post(
  '/workspaces/:workspaceId/github/file',
  authenticate,
  githubController.createFile
);

router.put(
  '/workspaces/:workspaceId/github/file',
  authenticate,
  githubController.updateFile
);

export default router;
