import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

/**
 * Express Application Factory
 * 
 * This module creates and configures the Express application.
 * It sets up middleware, enables CORS, and configures JSON parsing.
 * 
 * Routes are attached in server.js after database connections are established.
 */

const createApp = () => {
  const app = express();

  // CORS Configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Middleware: Request logging
  app.use(requestLogger);

  // Middleware: JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'running',
      service: 'Workspace Service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
