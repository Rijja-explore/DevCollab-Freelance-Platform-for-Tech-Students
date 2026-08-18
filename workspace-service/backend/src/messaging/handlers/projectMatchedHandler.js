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
  return value !== null;
};

const markProcessed = async (eventId) => {
  const redis = getRedisClient();
  const key   = `${DEDUP_PREFIX}${eventId}`;
  await redis.set(key, '1', { EX: DEDUP_TTL_SEC });
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
  if (!payload.projectId) missing.push('projectId');
  if (!payload.studentId) missing.push('studentId');
  if (!payload.startupId) missing.push('startupId');

  if (missing.length > 0) {
    throw new Error(`project.matched payload missing required fields: ${missing.join(', ')}`);
  }

  // Basic format check — projectId must be alphanumeric + hyphens/underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(payload.projectId)) {
    throw new Error(`project.matched invalid projectId format: "${payload.projectId}"`);
  }
};

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {Object} envelope - Full DevCollab event envelope.
 * @returns {{ duplicate: boolean, workspace: Object|null }}
 */
export const handleProjectMatched = async (envelope) => {
  validateEnvelope(envelope);

  const { event_id, payload } = envelope;

  validatePayload(payload);

  const { projectId, studentId, startupId } = payload;

  // ── Deduplicate ─────────────────────────────────────────────────────────────
  if (await isAlreadyProcessed(event_id)) {
    logger.info(`[projectMatchedHandler] Duplicate event_id=${event_id} — skipping`);
    return { duplicate: true, workspace: null };
  }

  // ── Idempotent workspace creation ────────────────────────────────────────────
  // Check whether a workspace for this project already exists.
  // The Workspace model has a unique index on projectId so we can also rely
  // on a duplicate-key error as a second safety net.
  const existing = await Workspace.findByProjectId(projectId.toLowerCase());

  if (existing) {
    logger.info(
      `[projectMatchedHandler] Workspace already exists for projectId="${projectId}" (id=${existing._id}) — skipping creation`
    );
    // Still mark processed so we don't re-check next time
    await markProcessed(event_id);
    return { duplicate: false, workspace: existing };
  }

  // ── Create workspace ─────────────────────────────────────────────────────────
  const workspace = new Workspace({ projectId, studentId, startupId });
  await workspace.save();

  logger.info(
    `[projectMatchedHandler] Workspace created: id=${workspace._id} projectId="${projectId}" student="${studentId}" startup="${startupId}"`
  );

  // Mark event as processed AFTER the DB write succeeds
  await markProcessed(event_id);

  return { duplicate: false, workspace };
};
