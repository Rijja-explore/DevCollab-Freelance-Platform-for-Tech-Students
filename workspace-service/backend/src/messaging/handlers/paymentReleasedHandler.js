/**
 * Handler: payment.released
 *
 * Published by Person C (Payment / Escrow Service) when milestone payment
 * has been successfully released to the student.
 *
 * Responsibilities:
 *   1. Validate envelope + payload.
 *   2. Deduplicate using event_id (Redis, 7-day TTL).
 *   3. Find the workspace that corresponds to the project.
 *   4. Create a SYSTEM message in the workspace chat.
 *   5. Broadcast the message via the existing Socket.IO emitter.
 *
 * The system message is the ONLY authoritative record of this event in the
 * workspace chat — the frontend cannot create it directly.
 *
 * Expected payload (from Person C):
 * {
 *   project_id:        string  (required)
 *   milestone_id:      string  (required)
 *   contract_id:       string  (required)
 *   transaction_id:    string  (required)
 *   student_id:        string  (required)
 *   startup_id:        string  (required)
 *   amount:            number  (required)
 *   currency:          string  (required, e.g. "USD")
 *   provider_payment_id: string
 *   status:            string  (should be "released")
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
  if (!envelope?.event_id)                         throw new Error('Missing event_id');
  if (!envelope?.payload || typeof envelope.payload !== 'object') throw new Error('Missing payload');
};

const validatePayload = (p) => {
  const required = ['project_id', 'milestone_id', 'contract_id', 'transaction_id',
                    'student_id', 'startup_id', 'amount', 'currency'];
  const missing = required.filter((f) => p[f] === undefined || p[f] === null || p[f] === '');
  if (missing.length > 0) throw new Error(`payment.released missing fields: ${missing.join(', ')}`);
  if (typeof p.amount !== 'number' || p.amount < 0) throw new Error('payment.released: amount must be a non-negative number');
};

// ── System message builder ────────────────────────────────────────────────────

const buildSystemMessage = (payload) => {
  const amt      = Number(payload.amount).toFixed(2);
  const currency = payload.currency || 'USD';
  return (
    `💸 Milestone payment released. ` +
    `Amount: ${currency} ${amt}. ` +
    `Milestone: ${payload.milestone_id}. ` +
    `Transaction: ${payload.transaction_id}.`
  );
};

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * @param {Object} envelope - Full DevCollab event envelope.
 * @returns {{ duplicate: boolean, message: Object|null }}
 */
export const handlePaymentReleased = async (envelope) => {
  validateEnvelope(envelope);

  const { event_id, payload } = envelope;

  validatePayload(payload);

  // ── Deduplicate ─────────────────────────────────────────────────────────────
  if (await isAlreadyProcessed(event_id)) {
    logger.info(`[paymentReleasedHandler] Duplicate event_id=${event_id} — skipping`);
    return { duplicate: true, message: null };
  }

  // ── Find workspace ───────────────────────────────────────────────────────────
  const workspace = await Workspace.findByProjectId(payload.project_id);

  if (!workspace) {
    // Log and treat as unrecoverable — no workspace exists for this project.
    // Mark processed so we don't retry forever.
    logger.error(
      `[paymentReleasedHandler] No workspace found for project_id="${payload.project_id}" (event_id=${event_id}) — cannot create system message`
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

  // Populate workspaceId for the socket payload (matches REST API shape)
  await message.populate('workspaceId', 'projectId');

  logger.info(
    `[paymentReleasedHandler] System message created in workspace ${workspace._id} (event_id=${event_id})`
  );

  // ── Broadcast via existing Socket.IO emitter ─────────────────────────────────
  socketEmitter.emitMessageCreated(workspace._id.toString(), message);

  // Mark processed AFTER DB write and socket emit succeed
  await markProcessed(event_id);

  return { duplicate: false, message };
};
