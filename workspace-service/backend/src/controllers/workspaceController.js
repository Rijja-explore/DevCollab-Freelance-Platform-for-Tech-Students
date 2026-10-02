/**
 * Workspace Controller
 * 
 * Handles HTTP requests for workspace operations.
 * Thin layer that delegates to services and formats responses.
 */

import workspaceService from '../services/workspaceService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/workspaces/:id
 * Get workspace by workspace ID
 */
export const getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    logger.info(`Getting workspace by ID: ${id}`);
    
    const result = await workspaceService.getWorkspaceById(id);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/project/:projectId
 * Get workspace by project ID
 */
export const getWorkspaceByProjectId = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    logger.info(`Getting workspace by project ID: ${projectId}`);
    
    const result = await workspaceService.getWorkspaceByProjectId(projectId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces
 * Get all workspaces (optionally filtered by user)
 */
export const getAllWorkspaces = async (req, res, next) => {
  try {
    const filter = {};
    const userId = req.user?.id;
    
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'ADMIN') {
      filter.userId = userId;
      logger.info(`[workspaceController] Fetching workspaces for user: ${userId} (role: ${req.user.role})`);
    } else {
      logger.info(`[workspaceController] Fetching all workspaces (admin user: ${userId})`);
    }
    
    const result = await workspaceService.getAllWorkspaces(filter);
    
    if (!result.success) {
      logger.warn(`[workspaceController] Failed to retrieve workspaces: ${result.message}`);
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    logger.info(`[workspaceController] ✅ Successfully retrieved ${result.data?.length || 0} workspaces for user: ${userId}`);
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    logger.error(`[workspaceController] Error fetching workspaces:`, error);
    next(error);
  }
};

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const workspaceData = {
      ...req.body,
      startupId: req.body.startupId || req.user?.id
    };
    
    logger.info(`Creating workspace for project: ${workspaceData.projectId}`);
    const result = await workspaceService.createWorkspace(workspaceData);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(result.statusCode || 201).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllWorkspaces,
  getWorkspaceById,
  getWorkspaceByProjectId,
  createWorkspace
};