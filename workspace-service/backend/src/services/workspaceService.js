/**
 * Workspace Service
 * 
 * Contains business logic for workspace operations.
 * Handles all workspace-related database interactions and business rules.
 */

import { Workspace } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Get workspace by ID
 */
export const getWorkspaceById = async (id) => {
  try {
    const workspace = await Workspace.findById(id);
    
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    return { success: true, data: workspace };
  } catch (error) {
    logger.error('Error getting workspace by ID:', error);
    return { success: false, message: 'Failed to retrieve workspace', statusCode: 500 };
  }
};

/**
 * Get workspace by project ID
 */
export const getWorkspaceByProjectId = async (projectId) => {
  try {
    const workspace = await Workspace.findByProjectId(projectId);
    
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    return { success: true, data: workspace };
  } catch (error) {
    logger.error('Error getting workspace by project ID:', error);
    return { success: false, message: 'Failed to retrieve workspace', statusCode: 500 };
  }
};

export default {
  getWorkspaceById,
  getWorkspaceByProjectId
};