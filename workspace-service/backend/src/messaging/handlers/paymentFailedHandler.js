/**
 * Handler: payment.failed
 *
 * Published by Person C (Payment / Escrow Service) when a milestone payment
 * attempt has failed.
 *
 * Responsibilities:
 *   1. Validate envelope + payload.
 *   2. Deduplicate using event_id (Redis, 7-day TTL).
 *   3. Find the workspace for the project.
 *   4. Create a SYSTEM message in the workspace chat.
 *   5. Broadcast via the existing Socket.IO emitter.
 *
 * Expected payload (from Person C):
 * {
 *   project_id:       string  (required)
 *   milestone_id:     string  (required)
 *   contract_id:      string  (required)
 *   transaction_id:   string  (optional — may not exist if payment never reached provider)
 *   amount:           number  (required)
 *   reason:           string  (required — human-readable failure reason)
 *   provider_order_id?: string
 * }
 */

import { Workspace, Message } from '../../models/index.js';
import { getRedisClient } from '../../config/redis.js';
import socketEmitter from '../../utils/socketEmitter.js';
import { logger } from '../../utils/logger.js';

const DEDUP_PREFIX  = 'dedup:workspace:';
const DEDUP_TTL_SEC = 7 * 24 * 60 * 60;
const SYSTEM_SENDER = 'system';

// ── Idempotency ───────────────────────────────────────────────────────────────

const isAlreadyProcessed = async (eventId) => {
  const redis = getRedisClient();
  return (await redis.get(`${DEDUP_PREFIX}${eventId}`)) !== null;
};

const markProcessed = async (eventId) => {
  const redis = getRedisClient();
  await redis.set(`${DEDUP_PREFIX}${eventId}`, '1', { EX: DEDUP_TTL_SEC });
};

// ── Validation ────────────────────────────────────────────────────────────────

const validateEnvelope = (envelope) => {
  if (!envelope?.event_id)                                          throw new Error('Missing event_id');
  if (!envelope?.payload || typeof envelope.payload !== 'object')   throw new Error('Missing payload');
};

const validatePayload = (p) => {
  const required = ['project_id', 'milestone_id', 'contract_id', 'amount', 'reason'];
  const missing  = required.filter((f) => p[f] === undefined || p[f] === null || p[f] === '');
  if (missing.length > 0) throw new Error(`payment.failed missing fields: ${missing.join(', ')}`);
  if (typeof p.amount !== 'number' || p.amount < 0) throw new Error('payment.failed: amount must be a non-negative number');
};

// ── System message builder ────────────────────────────────────────────────────

const buildSystemMessage = (payload) => {
  const amt = Number(payload.amount).toFixed(2);
  return (
    `⚠️ Milestone payment failed. ` +
    `Amount: USD ${amt}. ` +
    `Milestone: ${payload.milestone_id}. ` +
    `Reason: ${payload.reason}.`
  );
};

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {Object} envelope - Full DevCollab event envelope.
 * @returns {{ duplicate: boolean, message: Object|null }}
 */
export const handlePaymentFailed = async (envelope) => {
  validateEnvelope(envelope);

  const { event_id, payload } = envelope;

  validatePayload(payload);

  // ── Deduplicate ─────────────────────────────────────────────────────────────
  if (await isAlreadyProcessed(event_id)) {
    logger.info(`[paymentFailedHandler] Duplicate event_id=${event_id} — skipping`);
    return { duplicate: true, message: null };
  }

  // ── Find workspace ───────────────────────────────────────────────────────────
  const workspace = await Workspace.findByProjectId(payload.project_id);

  if (!workspace) {
    logger.error(
      `[paymentFailedHandler] No workspace found for project_id="${payload.project_id}" (event_id=${event_id})`
    );
    await markProcessed(event_id);
    return { duplicate: false, message: null };
  }

  // ── Create system message ────────────────────────────────────────────────────
  const text = buildSystemMessage(payload);

  const message = new Message({
    workspaceId: workspace._id,
    senderId:    SYSTEM_SENDER,
    text,
    type:        'SYSTEM',
  });
  await message.save();

  await message.populate('workspaceId', 'projectId');

  logger.info(
    `[paymentFailedHandler] System message created in workspace ${workspace._id} (event_id=${event_id})`
  );

  // ── Broadcast via existing Socket.IO emitter ─────────────────────────────────
  socketEmitter.emitMessageCreated(workspace._id.toString(), message);

  // Mark processed AFTER DB write succeeds
  await markProcessed(event_id);

  return { duplicate: false, message };
};
