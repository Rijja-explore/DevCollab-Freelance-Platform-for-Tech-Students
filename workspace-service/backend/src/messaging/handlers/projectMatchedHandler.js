/**
 * Handler: project.matched
 *
 * Published by Person A (Discovery & Matching Service) when a student and
 * startup are matched to a project.
 *
 * Responsibilities:
 *   1. Validate envelope + payload.
 *   2. Deduplicate using event_id (Redis, 7-day TTL).
 *   3. Create a Workspace for the project if one does not already exist.
 *   4. Silently skip (ack) if a workspace already exists (idempotency).
 *
 * Expected payload:
 * {
 *   projectId:  string  (required)
 *   studentId:  string  (required)
 *   startupId:  string  (required)
 *   // Optional extended fields from Person A — tolerated but not required:
 *   matchScore?: number
 *   matchedAt?:  string (ISO-8601)
 * }
 */

import { Workspace } from '../../models/index.js';
import { getRedisClient } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

// Redis key prefix for processed event IDs
const DEDUP_PREFIX  = 'dedup:workspace:';
const DEDUP_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

// ── Idempotency helpers ───────────────────────────────────────────────────────

const isAlreadyProcessed = async (eventId) => {
  const redis = getRedisClient();
  const key   = `${DEDUP_PREFIX}${eventId}`;
  const value = await redis.get(key);
  const result = value !== null;
  logger.debug(`[projectMatchedHandler] Redis dedup check: eventId=${eventId} already_processed=${result}`);
  return result;
};

const markProcessed = async (eventId) => {
  const redis = getRedisClient();
  const key   = `${DEDUP_PREFIX}${eventId}`;
  await redis.set(key, '1', { EX: DEDUP_TTL_SEC });
  logger.debug(`[projectMatchedHandler] Marked event as processed in Redis: eventId=${eventId} ttl=${DEDUP_TTL_SEC}s`);
};

// ── Validation ────────────────────────────────────────────────────────────────

const validateEnvelope = (envelope) => {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Invalid envelope: must be an object');
  }
  if (!envelope.event_id) {
    throw new Error('Invalid envelope: missing event_id');
  }
  if (!envelope.payload || typeof envelope.payload !== 'object') {
    throw new Error('Invalid envelope: missing payload');
  }
};

const validatePayload = (payload) => {
  const missing = [];
  if (!payload.projectId && !payload.project_id) missing.push('projectId/project_id');
  if (!payload.studentId && !payload.student_id) missing.push('studentId/student_id');
  if (!payload.startupId && !payload.startup_id) missing.push('startupId/startup_id');
  
  // projectName is optional but recommended
  if (!payload.project_title && !payload.projectTitle) {
    logger.warn('[projectMatchedHandler] Payload missing projectTitle/project_title — will use default');
  }

  if (missing.length > 0) {
    throw new Error(`project.matched payload missing required fields: ${missing.join(', ')}`);
  }

  // Get the actual IDs to validate
  const projectId = payload.projectId || payload.project_id;
  
  // Basic format check — projectId must be alphanumeric + hyphens/underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error(`project.matched invalid projectId format: "${projectId}"`);
  }
};

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {Object} envelope - Full DevCollab event envelope.
 * @returns {{ duplicate: boolean, workspace: Object|null }}
 */
export const handleProjectMatched = async (envelope) => {
  logger.info(`[projectMatchedHandler] ⏳ Starting workspace creation handler`);
  
  validateEnvelope(envelope);

  const { event_id, payload } = envelope;
  
  logger.info(`[projectMatchedHandler] Processing event: event_id=${event_id}`);
  logger.debug(`[projectMatchedHandler] Event payload:`, JSON.stringify(payload, null, 2));

  validatePayload(payload);

  // Support both camelCase and snake_case field names
  const projectId = payload.projectId || payload.project_id;
  const studentId = payload.studentId || payload.student_id;
  const startupId = payload.startupId || payload.startup_id;

  logger.info(`[projectMatchedHandler] Extracted IDs: projectId="${projectId}" studentId="${studentId}" startupId="${startupId}"`);

  // ── Deduplicate ─────────────────────────────────────────────────────────────
  if (await isAlreadyProcessed(event_id)) {
    logger.warn(`[projectMatchedHandler] ⚠️  Duplicate event_id=${event_id} — skipping workspace creation`);
    return { duplicate: true, workspace: null };
  }

  // ── Idempotent workspace creation ────────────────────────────────────────────
  // Check whether a workspace for this project already exists.
  logger.debug(`[projectMatchedHandler] Checking for existing workspace: projectId="${projectId}"`);
  
  const existing = await Workspace.findByProjectId(projectId.toLowerCase());

  if (existing) {
    logger.info(
      `[projectMatchedHandler] ℹ️  Workspace already exists for projectId="${projectId}" (id=${existing._id}) — skipping creation`
    );
    // Still mark processed so we don't re-check next time
    await markProcessed(event_id);
    return { duplicate: false, workspace: existing };
  }

  // ── Create workspace ─────────────────────────────────────────────────────────
  logger.info(`[projectMatchedHandler] 🆕 Creating new workspace for projectId="${projectId}"`);
  
  // Extract project name from event payload (supports both camelCase and snake_case)
  const projectName = payload.projectTitle || payload.project_title || 'Project';
  
  try {
    const workspace = new Workspace({ 
      projectId: projectId.toLowerCase(), 
      studentId, 
      startupId, 
      projectName 
    });
    
    logger.debug(`[projectMatchedHandler] Saving workspace document to MongoDB...`);
    await workspace.save();

    logger.info(
      `[projectMatchedHandler] ✅ Workspace created successfully: id=${workspace._id} projectId="${projectId}" projectName="${projectName}" student="${studentId}" startup="${startupId}"`
    );

    // Mark event as processed AFTER the DB write succeeds
    await markProcessed(event_id);

    logger.info(`[projectMatchedHandler] ✅ Event processing complete: event_id=${event_id}`);

    return { duplicate: false, workspace };
  } catch (error) {
    logger.error(`[projectMatchedHandler] ❌ Failed to create workspace: ${error.message}`, error);
    logger.error(`[projectMatchedHandler] Error details:`, {
      name: error.name,
      code: error.code,
      message: error.message,
      projectId,
      studentId,
      startupId
    });
    
    // Check if it's a duplicate key error (workspace already exists)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      logger.warn(`[projectMatchedHandler] ⚠️  Duplicate key error detected for projectId="${projectId}"`);
      // Try to find the existing workspace
      try {
        const existing = await Workspace.findByProjectId(projectId);
        if (existing) {
          logger.info(`[projectMatchedHandler] Found existing workspace despite duplicate error: ${existing._id}`);
          await markProcessed(event_id);
          return { duplicate: false, workspace: existing };
        }
      } catch (findErr) {
        logger.error(`[projectMatchedHandler] Failed to find existing workspace after duplicate error:`, findErr);
      }
    }
    
    // Re-throw the error so it's handled by the consumer
    throw error;
  }
};
