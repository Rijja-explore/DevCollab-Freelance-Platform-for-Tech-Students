/**
 * RabbitMQ Connection Manager
 *
 * Owns the single AMQP connection and channel for the Workspace Service.
 * All publishers and consumers share this connection.
 *
 * Responsibilities:
 * - Establish and cache the connection + channel.
 * - Declare the shared topic exchange (devcollab.events).
 * - Expose a clean connect/disconnect API called from server.js.
 * - Reconnect on unexpected close with exponential back-off.
 */

import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';

// ── Configuration ─────────────────────────────────────────────────────────────

const getRabbitConfig = () => ({
  host:     process.env.RABBITMQ_HOST     || 'localhost',
  port:     parseInt(process.env.RABBITMQ_PORT || '5672', 10),
  username: process.env.RABBITMQ_USERNAME || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  exchange: process.env.RABBITMQ_EXCHANGE || 'devcollab.events',
});

// ── Module state ─────────────────────────────────────────────────────────────

let connection = null;
let channel    = null;
let isShuttingDown = false;

// ── Internal helpers ─────────────────────────────────────────────────────────

const buildUrl = (cfg) =>
  `amqp://${cfg.username}:${cfg.password}@${cfg.host}:${cfg.port}`;

/**
 * Attempt connection with simple retry.
 * Retries up to maxAttempts with 2-second incremental delay.
 */
const connectWithRetry = async (cfg, maxAttempts = 5) => {
  const url = buildUrl(cfg);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`RabbitMQ: connecting (attempt ${attempt}/${maxAttempts}) → ${cfg.host}:${cfg.port}`);
      const conn = await amqplib.connect(url);
      logger.info('RabbitMQ: connection established');
      return conn;
    } catch (err) {
      logger.error(`RabbitMQ: connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) {
        const delay = attempt * 2000;
        logger.info(`RabbitMQ: retrying in ${delay / 1000}s…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error('RabbitMQ: could not connect after maximum attempts');
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Connect to RabbitMQ, create a channel, and assert the shared exchange.
 * Idempotent — returns the existing channel if already connected.
 */
export const connectRabbitMQ = async () => {
  if (channel) return channel;

  const cfg = getRabbitConfig();

  connection = await connectWithRetry(cfg);

  // Reconnect handler — fires when the broker drops the connection
  connection.on('close', () => {
    if (isShuttingDown) return;
    logger.warn('RabbitMQ: connection closed unexpectedly — will reconnect in 5s');
    connection = null;
    channel    = null;
    setTimeout(() => connectRabbitMQ().catch((err) =>
      logger.error('RabbitMQ: reconnect failed:', err.message)
    ), 5000);
  });

  connection.on('error', (err) => {
    logger.error('RabbitMQ: connection error:', err.message);
  });

  channel = await connection.createChannel();

  channel.on('error', (err) => {
    logger.error('RabbitMQ: channel error:', err.message);
  });

  channel.on('close', () => {
    logger.warn('RabbitMQ: channel closed');
    channel = null;
  });

  // Assert the shared topic exchange (durable = survives broker restart)
  await channel.assertExchange(cfg.exchange, 'topic', { durable: true });
  logger.info(`RabbitMQ: exchange "${cfg.exchange}" ready`);

  return channel;
};

/**
 * Return the live channel.
 * Throws if connectRabbitMQ() has not been called yet.
 */
export const getChannel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialised. Call connectRabbitMQ() first.');
  }
  return channel;
};

/**
 * Return the exchange name from env / defaults.
 */
export const getExchange = () =>
  process.env.RABBITMQ_EXCHANGE || 'devcollab.events';

/**
 * Graceful shutdown — close channel then connection.
 */
export const disconnectRabbitMQ = async () => {
  isShuttingDown = true;
  try {
    if (channel) {
      await channel.close();
      channel = null;
      logger.info('RabbitMQ: channel closed');
    }
    if (connection) {
      await connection.close();
      connection = null;
      logger.info('RabbitMQ: connection closed');
    }
  } catch (err) {
    logger.error('RabbitMQ: error during disconnect:', err.message);
  }
};
