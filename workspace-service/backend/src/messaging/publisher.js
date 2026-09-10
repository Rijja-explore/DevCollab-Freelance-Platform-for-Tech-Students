/**
 * RabbitMQ Publisher
 *
 * Publishes events from the Workspace Service to the shared
 * devcollab.events topic exchange.
 *
 * Currently publishes:
 *   milestone.completed  →  consumed by Person C (Payment / Escrow Service)
 *
 * Event envelope (shared contract):
 * {
 *   event_id:    string (uuid-v4)
 *   event_type:  string (routing key)
 *   version:     "1"
 *   occurred_at: ISO-8601
 *   producer:    "workspace-service"
 *   payload:     {}
 * }
 */

import { randomUUID } from 'crypto';
import { getChannel, getExchange } from './rabbitmq.js';
import { logger } from '../utils/logger.js';

// ── Routing keys ─────────────────────────────────────────────────────────────

export const ROUTING_KEYS = {
  MILESTONE_COMPLETED: 'milestone.completed',
};

// ── Envelope builder ──────────────────────────────────────────────────────────

/**
 * Wrap a payload in the shared DevCollab event envelope.
 * @param {string} eventType - Routing key / event name.
 * @param {Object} payload   - Business data.
 * @returns {Object} Full envelope ready for JSON serialisation.
 */
const buildEnvelope = (eventType, payload) => ({
  event_id:    randomUUID(),
  event_type:  eventType,
  version:     '1',
  occurred_at: new Date().toISOString(),
  producer:    'workspace-service',
  payload,
});

// ── Low-level publish ─────────────────────────────────────────────────────────

/**
 * Serialise an envelope and publish it to the exchange.
 * Returns true on success, false if the channel is not ready.
 * Never throws — failures are logged only so callers are not interrupted.
 *
 * @param {string} routingKey
 * @param {Object} envelope
 */
const publish = (routingKey, envelope) => {
  try {
    const ch       = getChannel();
    const exchange = getExchange();
    const buffer   = Buffer.from(JSON.stringify(envelope));

    const ok = ch.publish(exchange, routingKey, buffer, {
      persistent:   true,           // survive broker restart
      contentType:  'application/json',
      timestamp:    Date.now(),
    });

    if (ok) {
      logger.info(`RabbitMQ published → [${exchange}] ${routingKey} (event_id: ${envelope.event_id})`);
    } else {
      logger.warn(`RabbitMQ: publish returned false for ${routingKey} — channel buffer may be full`);
    }

    return ok;
  } catch (err) {
    logger.error(`RabbitMQ: failed to publish ${routingKey}:`, err.message);
    return false;
  }
};

// ── Typed publisher ───────────────────────────────────────────────────────────

/**
 * Publish a milestone.completed event.
 *
 * Payload contract (as agreed with Person C):
 * {
 *   project_id:       string   — workspace.projectId
 *   milestone_id:     string   — milestone._id
 *   contract_id:      string   — milestone.contractId
 *   student_id:       string   — milestone.studentId
 *   amount:           number   — milestone.amount
 *   completion_notes: string | null
 * }
 *
 * @param {Object} milestone  - Mongoose Milestone document (or plain object with same fields).
 */
export const publishMilestoneCompleted = (milestone) => {
  const payload = {
    project_id:       milestone.projectId,
    milestone_id:     milestone.id ?? milestone._id?.toString(),
    contract_id:      milestone.contractId,
    student_id:       milestone.studentId,
    amount:           milestone.amount,
    completion_notes: milestone.completionNotes ?? null,
  };

  const envelope = buildEnvelope(ROUTING_KEYS.MILESTONE_COMPLETED, payload);
  return publish(ROUTING_KEYS.MILESTONE_COMPLETED, envelope);
};
