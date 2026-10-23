import express from 'express';
import workspacesRouter from './workspaces.js';
import messagesRouter from './messages.js';
import commentsRouter from './comments.js';
import milestonesRouter from './milestones.js';
import githubRouter from './github.js';

const router = express.Router();

// Workspace routes
router.use('/workspaces', workspacesRouter);

// Message, comment and milestone routes (share flat /workspaces/:id/* and /resources/:id paths)
router.use('/', messagesRouter);
router.use('/', commentsRouter);
router.use('/', milestonesRouter);

// GitHub Code Review routes — /api/workspaces/:workspaceId/github/*
router.use('/', githubRouter);

export default router;