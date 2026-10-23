/**
 * GitHub Controller
 *
 * Handles all GitHub Code Review API endpoints for a workspace.
 *
 * Security model (enforced on every request):
 *  1. JWT authenticated via existing `authenticate` middleware (req.user is set).
 *  2. Workspace membership — req.user.id must match workspace.studentId OR
 *     workspace.startupId.
 *  3. Repository association — the linked repo is read from the workspace
 *     document only; users cannot supply an arbitrary owner/repo.
 *  4. The GITHUB_TOKEN is never included in any response.
 *
 * Routes handled:
 *  GET    /api/workspaces/:workspaceId/github/repo        – repo info / link status
 *  PUT    /api/workspaces/:workspaceId/github/repo        – link a repository
 *  GET    /api/workspaces/:workspaceId/github/files       – list files at a path
 *  GET    /api/workspaces/:workspaceId/github/file        – get file content
 *  POST   /api/workspaces/:workspaceId/github/file        – create a new file
 *  PUT    /api/workspaces/:workspaceId/github/file        – update an existing file
 */

import { Workspace } from '../models/index.js';
import githubService from '../services/githubService.js';
import { logger } from '../utils/logger.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Resolve and authorise access to the workspace.
 * Returns { workspace } on success or sends an HTTP error response.
 */
const resolveAuthorisedWorkspace = async (req, res) => {
  const { workspaceId } = req.params;

  let workspace = null;
  try {
    workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      workspace = await Workspace.findOne({ projectId: workspaceId });
    }
  } catch {
    // invalid ObjectId — fall through to 404
  }

  if (!workspace) {
    res.status(404).json({ success: false, message: 'Workspace not found' });
    return null;
  }

  // Membership check — user must be the student or the startup for this workspace
  const userId = req.user.id;
  if (workspace.studentId !== userId && workspace.startupId !== userId) {
    res.status(403).json({ success: false, message: 'Forbidden: you are not a member of this workspace' });
    return null;
  }

  return workspace;
};

/**
 * Ensure the workspace has a linked GitHub repository.
 * Returns { workspace, owner, repo } or sends 422.
 */
const resolveLinkedRepo = async (req, res) => {
  const workspace = await resolveAuthorisedWorkspace(req, res);
  if (!workspace) return null;

  if (!workspace.githubOwner || !workspace.githubRepo) {
    res.status(422).json({
      success: false,
      message: 'This workspace has no linked GitHub repository. Link one first via PUT /github/repo.',
    });
    return null;
  }

  return { workspace, owner: workspace.githubOwner, repo: workspace.githubRepo };
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/workspaces/:workspaceId/github/repo
 * Returns linked repository info.
 * If no repo is linked, returns { linked: false }.
 */
export const getRepo = async (req, res, next) => {
  try {
    const workspace = await resolveAuthorisedWorkspace(req, res);
    if (!workspace) return;

    if (!workspace.githubOwner || !workspace.githubRepo) {
      return res.json({ success: true, linked: false });
    }

    const result = await githubService.getRepoInfo(workspace.githubOwner, workspace.githubRepo);
    if (!result.success) {
      return res.status(result.statusCode || 502).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      linked: true,
      githubOwner: workspace.githubOwner,
      githubRepo: workspace.githubRepo,
      repo: result.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/workspaces/:workspaceId/github/repo
 * Link (or re-link) a GitHub repository to the workspace.
 *
 * Body: { githubOwner: string, githubRepo: string }
 *
 * The controller validates that the token can actually reach the repository
 * before persisting, so bad values are caught immediately.
 */
export const linkRepo = async (req, res, next) => {
  try {
    const workspace = await resolveAuthorisedWorkspace(req, res);
    if (!workspace) return;

    const { githubOwner, githubRepo } = req.body;

    if (!githubOwner || typeof githubOwner !== 'string' || !githubOwner.trim()) {
      return res.status(400).json({ success: false, message: 'githubOwner is required' });
    }
    if (!githubRepo || typeof githubRepo !== 'string' || !githubRepo.trim()) {
      return res.status(400).json({ success: false, message: 'githubRepo is required' });
    }

    // Validate the repository is accessible with the configured token
    const verifyResult = await githubService.getRepoInfo(githubOwner.trim(), githubRepo.trim());
    if (!verifyResult.success) {
      return res.status(verifyResult.statusCode || 502).json({
        success: false,
        message: `Cannot access repository: ${verifyResult.message}`,
      });
    }

    workspace.githubOwner = githubOwner.trim();
    workspace.githubRepo = githubRepo.trim();
    await workspace.save();

    logger.info(`Workspace ${workspace._id} linked to GitHub repo ${githubOwner}/${githubRepo} by user ${req.user.id}`);

    res.json({
      success: true,
      githubOwner: workspace.githubOwner,
      githubRepo: workspace.githubRepo,
      repo: verifyResult.data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId/github/files?path=src&ref=main
 * List files/folders at the given path in the linked repository.
 */
export const listFiles = async (req, res, next) => {
  try {
    const resolved = await resolveLinkedRepo(req, res);
    if (!resolved) return;

    const { owner, repo } = resolved;
    const path = req.query.path || '';
    const ref = req.query.ref || undefined;

    const result = await githubService.listContents(owner, repo, path, ref);
    if (!result.success) {
      return res.status(result.statusCode || 502).json({ success: false, message: result.message });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId/github/file?path=src/App.js&ref=main
 * Fetch the decoded content of a single file.
 */
export const getFile = async (req, res, next) => {
  try {
    const resolved = await resolveLinkedRepo(req, res);
    if (!resolved) return;

    const { owner, repo } = resolved;
    const filePath = req.query.path;
    const ref = req.query.ref || undefined;

    if (!filePath) {
      return res.status(400).json({ success: false, message: 'Query parameter "path" is required' });
    }

    const result = await githubService.getFileContent(owner, repo, filePath, ref);
    if (!result.success) {
      return res.status(result.statusCode || 502).json({ success: false, message: result.message });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/workspaces/:workspaceId/github/file
 * Create a new file in the linked repository.
 *
 * Body: { path: string, content: string, message?: string, branch?: string }
 */
export const createFile = async (req, res, next) => {
  try {
    const resolved = await resolveLinkedRepo(req, res);
    if (!resolved) return;

    const { owner, repo } = resolved;
    const { path: filePath, content, message, branch } = req.body;

    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return res.status(400).json({ success: false, message: 'Body field "path" is required' });
    }
    if (content === undefined || content === null) {
      return res.status(400).json({ success: false, message: 'Body field "content" is required' });
    }

    const commitMessage = (message || `Add ${filePath} via DevCollab Code Review`).trim();

    const result = await githubService.createFile(
      owner, repo,
      filePath.trim(),
      typeof content === 'string' ? content : String(content),
      commitMessage,
      branch || undefined,
    );

    if (!result.success) {
      return res.status(result.statusCode || 502).json({ success: false, message: result.message });
    }

    logger.info(`File created in ${owner}/${repo}: ${filePath} by user ${req.user.id}`);

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/workspaces/:workspaceId/github/file
 * Update an existing file in the linked repository.
 *
 * Body: { path: string, content: string, sha: string, message?: string, branch?: string }
 */
export const updateFile = async (req, res, next) => {
  try {
    const resolved = await resolveLinkedRepo(req, res);
    if (!resolved) return;

    const { owner, repo } = resolved;
    const { path: filePath, content, sha, message, branch } = req.body;

    if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
      return res.status(400).json({ success: false, message: 'Body field "path" is required' });
    }
    if (content === undefined || content === null) {
      return res.status(400).json({ success: false, message: 'Body field "content" is required' });
    }
    if (!sha || typeof sha !== 'string' || !sha.trim()) {
      return res.status(400).json({ success: false, message: 'Body field "sha" is required for updates' });
    }

    const commitMessage = (message || `Update ${filePath} via DevCollab Code Review`).trim();

    const result = await githubService.updateFile(
      owner, repo,
      filePath.trim(),
      typeof content === 'string' ? content : String(content),
      sha.trim(),
      commitMessage,
      branch || undefined,
    );

    if (!result.success) {
      return res.status(result.statusCode || 502).json({ success: false, message: result.message });
    }

    logger.info(`File updated in ${owner}/${repo}: ${filePath} by user ${req.user.id}`);

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
};

export default {
  getRepo,
  linkRepo,
  listFiles,
  getFile,
  createFile,
  updateFile,
};
