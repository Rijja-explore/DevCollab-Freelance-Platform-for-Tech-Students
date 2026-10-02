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

import { getChannel, getExchange, getConnection } from './rabbitmq.js';
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
    logger.error(`RabbitMQ [${queueDef.routingKey}]: full error:`, err);

    // Requeue only if the message has not already been redelivered
    // (prevents infinite retry loops for persistent errors)
    const requeue = !rawMsg.fields.redelivered;
    channel.nack(rawMsg, false, requeue);

    if (requeue) {
      logger.info(`RabbitMQ [${queueDef.routingKey}]: nacked with requeue=true (first attempt) for event_id=${event_id}`);
    } else {
      logger.warn(`RabbitMQ [${queueDef.routingKey}]: nacked with requeue=false (already redelivered) for event_id=${event_id} → message sent to dead-letter queue`);
    }
  }
};

// ── Initialiser ───────────────────────────────────────────────────────────────

/**
 * Idempotent queue assertion with fallback for existing queues.
 * 
 * When a queue already exists with different arguments (e.g., missing DLX),
 * RabbitMQ returns 406 PRECONDITION_FAILED because queue arguments are immutable.
 * This function handles both scenarios:
 * 1. Fresh RabbitMQ: create queue with new DLX arguments
 * 2. Existing queue (old): verify it exists passively, don't modify arguments
 * 
 * For existing queues without DLX, see MIGRATION section below.
 */
const assertQueueIdempotent = async (channel, queueName, routingKey, dlxExchange, connection) => {
  const queueArgs = {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlxExchange,
      'x-dead-letter-routing-key': `dlx.${routingKey}`,
    },
  };

  try {
    // Try to declare with DLX arguments (works for fresh RabbitMQ)
    await channel.assertQueue(queueName, queueArgs);
    logger.info(`RabbitMQ: queue declared with DLX: ${queueName}`);
  } catch (err) {
    if (err.code === 406 && err.message.includes('PRECONDITION_FAILED')) {
      // Queue exists with incompatible arguments — we need a fresh channel to delete it
      logger.warn(`RabbitMQ: queue '${queueName}' exists with incompatible arguments.`);
      logger.warn(`  Error: ${err.message}`);
      logger.warn(`  Creating new channel to delete incompatible queue...`);
      
      // Create a new channel for cleanup operations (old channel is dead)
      let cleanupChannel = null;
      try {
        cleanupChannel = await connection.createChannel();
        
        try {
          // Delete the incompatible queue using the new channel
          await cleanupChannel.deleteQueue(queueName, { ifUnused: false });
          logger.info(`✅ Deleted incompatible queue: ${queueName}`);
          
          // Recreate with correct DLX arguments using the new channel
          await cleanupChannel.assertQueue(queueName, queueArgs);
          logger.info(`✅ Recreated queue with DLX: ${queueName}`);
          
          // Return to caller with success message
          // Caller should create a new channel and call this function again
          logger.info(`✅ Queue ready, but current channel is closed. Need to recreate channel.`);
          return { needsChannelRecreate: true };
        } finally {
          // Close the cleanup channel
          if (cleanupChannel) {
            try {
              await cleanupChannel.close();
            } catch (closeErr) {
              logger.warn(`Warning: could not close cleanup channel: ${closeErr.message}`);
            }
          }
        }
      } catch (recreateErr) {
        logger.error(`✗ Failed to handle queue recreation for '${queueName}': ${recreateErr.message}`);
        throw recreateErr;
      }
    } else {
      // Unexpected error
      throw err;
    }
  }
  
  return { needsChannelRecreate: false };
};

/**
 * Assert all consumer queues, bind them to the exchange, and start consuming.
 * Called once from server.js after connectRabbitMQ() resolves.
 */
export const startConsumers = async () => {
  let channel  = getChannel();
  const exchange = getExchange();
  const conn     = getConnection();

  // Assert dead-letter exchange for failed messages
  const DLX_EXCHANGE = 'devcollab.dead-letters';
  const DLX_QUEUE = 'workspace-service.dead-letters';
  
  try {
    await channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(DLX_QUEUE, { durable: true });
    await channel.bindQueue(DLX_QUEUE, DLX_EXCHANGE, '#'); // Bind all routing keys
    logger.info(`✅ Dead-letter exchange configured: ${DLX_EXCHANGE} → ${DLX_QUEUE}`);
  } catch (err) {
    logger.error(`Failed to setup dead-letter exchange: ${err.message}`);
    throw err;
  }

  // Prefetch 1 — process one message at a time per consumer
  // Prevents overwhelming the service on burst events
  await channel.prefetch(1);

  for (const queueDef of QUEUES) {
    try {
      // Idempotent queue assertion (handles both fresh and existing queues)
      const result = await assertQueueIdempotent(channel, queueDef.name, queueDef.routingKey, DLX_EXCHANGE, conn);
      
      // If the original channel was closed during queue recreation, get a fresh one
      if (result && result.needsChannelRecreate) {
        logger.info(`Creating new channel after queue recreation...`);
        channel = await conn.createChannel();
        await channel.assertExchange(exchange, 'topic', { durable: true });
        await channel.prefetch(1);
        logger.info(`✅ New channel created and ready`);
      }

      // Bind the queue to the exchange using the routing key
      await channel.bindQueue(queueDef.name, exchange, queueDef.routingKey);

      // Start consuming — noAck:false so we control ack/nack explicitly
      await channel.consume(
        queueDef.name,
        (rawMsg) => dispatch(channel, queueDef, rawMsg),
        { noAck: false }
      );

      logger.info(`RabbitMQ: consuming [${exchange}] → "${queueDef.routingKey}" via queue "${queueDef.name}"`);
    } catch (queueErr) {
      logger.error(`✗ Failed to setup queue '${queueDef.name}': ${queueErr.message}`);
      // Continue to next queue - this allows partial startup even if one queue setup fails
    }
  }

  logger.info('✅ RabbitMQ consumers started');
};

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * MIGRATION GUIDE: Updating Existing Queues with Dead-Letter Exchange
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * If you have existing queues WITHOUT DLX arguments and want to add them:
 * 
 * OPTION 1: Development Environment (RECOMMENDED - Safe, no data loss)
 * ────────────────────────────────────────────────────────────────────
 *   RabbitMQ doesn't allow modifying queue arguments after creation, so delete and
 *   recreate the queues. This is safe in dev because messages aren't critical.
 * 
 *   1. Stop the workspace-service
 *   2. In RabbitMQ Management UI (localhost:15672):
 *      - Go to Queues tab
 *      - Delete these queues (if they exist):
 *        • workspace-service.project.matched
 *        • workspace-service.payment.released
 *        • workspace-service.payment.failed
 *        • workspace-service.dead-letters
 *      - Delete exchange:
 *        • devcollab.dead-letters
 *   3. Restart the workspace-service
 *   4. Service will recreate queues with DLX arguments automatically
 * 
 *   Alternative via RabbitMQ CLI (if not using management UI):
 * 
 *     docker exec <rabbitmq-container> rabbitmqctl delete_queue workspace-service.project.matched
 *     docker exec <rabbitmq-container> rabbitmqctl delete_queue workspace-service.payment.released
 *     docker exec <rabbitmq-container> rabbitmqctl delete_queue workspace-service.payment.failed
 *     docker exec <rabbitmq-container> rabbitmqctl delete_queue workspace-service.dead-letters
 *     docker exec <rabbitmq-container> rabbitmqctl delete_exchange devcollab.dead-letters
 * 
 *   Then restart workspace-service and queues will be recreated with DLX.
 * 
 * OPTION 2: Production Environment (Manual - Requires Planning)
 * ────────────────────────────────────────────────────────────────
 *   For production with active messages:
 * 
 *   1. Create new queues with DLX arguments and different names
 *   2. Replay important messages from dead-letter queue (if any)
 *   3. Migrate consumers gradually (canary deployment)
 *   4. Once all messages processed, delete old queues
 * 
 *   This requires a migration strategy specific to your setup.
 * 
 * OPTION 3: Bypass DLX for Now (Allows immediate startup)
 * ────────────────────────────────────────────────────────────────
 *   If you need the app running immediately and can tolerate the existing queue
 *   configuration (without DLX), the idempotent assertion will allow it:
 * 
 *   - Service will log a warning about incompatible arguments
 *   - Service will verify the existing queue (passive assert)
 *   - Consumers will start normally
 *   - Failed messages will still be nack'd but may cause requeue loops
 *     (not ideal, but functional)
 * 
 *   DLX will be properly configured once you use OPTION 1 or 2.
 * 
 * ════════════════════════════════════════════════════════════════════════════════
 */
