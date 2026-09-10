/**
 * RabbitMQ Consumer
 *
 * Creates the Workspace Service's durable consumer queues, binds them
 * to the devcollab.events exchange, and dispatches each message to the
 * appropriate handler.
 *
 * Queues owned by the Workspace Service:
 *
 *   workspace-service.project.matched
 *     └── routing key: project.matched
 *         Emitted by: Person A (Discovery & Matching Service)
 *
 *   workspace-service.payment.released
 *     └── routing key: payment.released
 *         Emitted by: Person C (Payment / Escrow Service)
 *
 *   workspace-service.payment.failed
 *     └── routing key: payment.failed
 *         Emitted by: Person C (Payment / Escrow Service)
 *
 * Each handler is responsible for:
 *   - Validating the event envelope and payload.
 *   - Deduplicating via Redis using event_id.
 *   - Executing the business operation.
 *   - Acknowledging (ack) the message only on success.
 *   - Rejecting (nack, no requeue) on unrecoverable errors after logging.
 */

import { getChannel, getExchange } from './rabbitmq.js';
import { handleProjectMatched }  from './handlers/projectMatchedHandler.js';
import { handlePaymentReleased } from './handlers/paymentReleasedHandler.js';
import { handlePaymentFailed }   from './handlers/paymentFailedHandler.js';
import { logger } from '../utils/logger.js';

// ── Queue definitions ─────────────────────────────────────────────────────────

const QUEUES = [
  {
    name:       'workspace-service.project.matched',
    routingKey: 'project.matched',
    handler:    handleProjectMatched,
  },
  {
    name:       'workspace-service.payment.released',
    routingKey: 'payment.released',
    handler:    handlePaymentReleased,
  },
  {
    name:       'workspace-service.payment.failed',
    routingKey: 'payment.failed',
    handler:    handlePaymentFailed,
  },
];

// ── Message dispatcher ────────────────────────────────────────────────────────

/**
 * Parse the raw AMQP message, call the handler, and ack/nack accordingly.
 *
 * Ack policy:
 *   - Successful processing   → ack
 *   - Duplicate (idempotency) → ack (already handled, safe to discard)
 *   - Validation error        → nack, no requeue (bad data — would loop forever)
 *   - Transient/unknown error → nack, requeue once (may succeed on retry)
 */
const dispatch = async (channel, queueDef, rawMsg) => {
  if (!rawMsg) return; // consumer cancelled

  let envelope;

  // ── Parse ──────────────────────────────────────────────────────────────────
  try {
    envelope = JSON.parse(rawMsg.content.toString());
  } catch (parseErr) {
    logger.error(`RabbitMQ [${queueDef.name}]: failed to parse message — nacking without requeue`);
    channel.nack(rawMsg, false, false);
    return;
  }

  const { event_id, event_type, payload } = envelope;
  logger.info(`RabbitMQ [${queueDef.routingKey}] received event_id=${event_id} type=${event_type}`);

  // ── Dispatch ───────────────────────────────────────────────────────────────
  try {
    const result = await queueDef.handler(envelope);

    if (result.duplicate) {
      logger.info(`RabbitMQ [${queueDef.routingKey}]: duplicate event_id=${event_id} — acking and skipping`);
    }

    channel.ack(rawMsg);
  } catch (err) {
    logger.error(`RabbitMQ [${queueDef.routingKey}]: handler error for event_id=${event_id}:`, err.message);

    // Requeue only if the message has not already been redelivered
    // (prevents infinite retry loops for persistent errors)
    const requeue = !rawMsg.fields.redelivered;
    channel.nack(rawMsg, false, requeue);

    if (requeue) {
      logger.info(`RabbitMQ [${queueDef.routingKey}]: nacked with requeue=true (first attempt)`);
    } else {
      logger.warn(`RabbitMQ [${queueDef.routingKey}]: nacked with requeue=false (already redelivered) — message dropped`);
    }
  }
};

// ── Initialiser ───────────────────────────────────────────────────────────────

/**
 * Assert all consumer queues, bind them to the exchange, and start consuming.
 * Called once from server.js after connectRabbitMQ() resolves.
 */
export const startConsumers = async () => {
  const channel  = getChannel();
  const exchange = getExchange();

  // Prefetch 1 — process one message at a time per consumer
  // Prevents overwhelming the service on burst events
  await channel.prefetch(1);

  for (const queueDef of QUEUES) {
    // Durable queue — survives broker restart
    await channel.assertQueue(queueDef.name, {
      durable:    true,
      arguments: {
        // Dead-letter exchange can be added here in the future
        // 'x-dead-letter-exchange': 'devcollab.dead-letters',
      },
    });

    // Bind the queue to the exchange using the routing key
    await channel.bindQueue(queueDef.name, exchange, queueDef.routingKey);

    // Start consuming — noAck:false so we control ack/nack explicitly
    await channel.consume(
      queueDef.name,
      (rawMsg) => dispatch(channel, queueDef, rawMsg),
      { noAck: false }
    );

    logger.info(`RabbitMQ: consuming [${exchange}] → "${queueDef.routingKey}" via queue "${queueDef.name}"`);
  }

  logger.info('✅ RabbitMQ consumers started');
};
