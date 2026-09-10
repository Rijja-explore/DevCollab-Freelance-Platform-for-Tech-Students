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

export default {
  getWorkspaceById,
  getWorkspaceByProjectId
};