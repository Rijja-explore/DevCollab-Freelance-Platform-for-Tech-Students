import mongoose from 'mongoose';
import { Workspace } from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Get all workspaces (optional filter by user or project)
 */
export const getAllWorkspaces = async (filter = {}) => {
  try {
    let query = {};
    if (filter.userId) {
      query = {
        $or: [
          { startupId: filter.userId },
          { studentId: filter.userId }
        ]
      };
    }
    const workspaces = await Workspace.find(query).sort({ createdAt: -1 });
    return { success: true, data: workspaces };
  } catch (error) {
    logger.error('Error getting all workspaces:', error);
    return { success: false, message: 'Failed to retrieve workspaces', statusCode: 500 };
  }
};

/**
 * Get workspace by ID (supports MongoDB _id and projectId)
 */
export const getWorkspaceById = async (id) => {
  try {
    let workspace = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      workspace = await Workspace.findById(id);
    }
    if (!workspace) {
      workspace = await Workspace.findOne({ projectId: id });
    }
    
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
    const workspace = await Workspace.findOne({ projectId });
    
    if (!workspace) {
      return { success: false, message: 'Workspace not found', statusCode: 404 };
    }
    
    return { success: true, data: workspace };
  } catch (error) {
    logger.error('Error getting workspace by project ID:', error);
    return { success: false, message: 'Failed to retrieve workspace', statusCode: 500 };
  }
};

/**
 * Create a new workspace or return existing for projectId
 */
export const createWorkspace = async (workspaceData) => {
  try {
    const { projectId, startupId, studentId, title } = workspaceData;
    
    if (!projectId) {
      return { success: false, message: 'Project ID is required', statusCode: 400 };
    }

    let workspace = await Workspace.findOne({ projectId });
    if (workspace) {
      return { success: true, data: workspace };
    }

    workspace = new Workspace({
      projectId,
      startupId: startupId || 'startup-owner-1',
      studentId: studentId || 'student-user-1',
      title: title || `Workspace for Project ${projectId.slice(0, 8)}`,
      status: 'ACTIVE'
    });

    await workspace.save();
    logger.info(`Created new workspace: ${workspace._id} for project: ${projectId}`);
    return { success: true, data: workspace, statusCode: 201 };
  } catch (error) {
    logger.error('Error creating workspace:', error);
    return { success: false, message: error.message || 'Failed to create workspace', statusCode: 500 };
  }
};

export default {
  getAllWorkspaces,
  getWorkspaceById,
  getWorkspaceByProjectId,
  createWorkspace
};