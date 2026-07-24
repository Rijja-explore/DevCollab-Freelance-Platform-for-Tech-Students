/**
 * Routes Index
 * 
 * Centralized route registration for the API.
 * Combines all route modules and applies the /api prefix.
 */

import express from 'express';
import workspacesRouter from './workspaces.js';
import messagesRouter from './messages.js';
import commentsRouter from './comments.js';

const router = express.Router();

// Health check endpoint (already exists in app.js)
// Workspace routes
router.use('/workspaces', workspacesRouter);

// Message and comment routes (combined because they share some paths)
router.use('/', messagesRouter);
router.use('/', commentsRouter);

export default router;