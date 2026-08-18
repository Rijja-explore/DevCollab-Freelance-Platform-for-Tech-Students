#!/usr/bin/env node
/**
 * publishTestEvent.js  —  Phase 8 Development / Testing Utility
 *
 * Publishes a realistic mock event directly to RabbitMQ so the Workspace
 * Service consumers can be exercised without waiting for Person A or Person C
 * to implement their publishers.
 *
 * Usage:
 *   node scripts/publishTestEvent.js <routing-key> [options]
 *
 * Supported routing keys:
 *   project.matched       — triggers workspace creation
 *   payment.released      — creates a "payment released" system message
 *   payment.failed        — creates a "payment failed" system message
 *   milestone.completed   — publishes the workspace-service outbound event
 *                           (use to verify the envelope shape, not consumed here)
 *
 * Options:
 *   --project-id  <id>    override projectId  (default: test-project-<random>)
 *   --workspace-id <id>   override workspaceId for payment events
 *   --event-id    <id>    override event_id   (default: new uuid)
 *   --duplicate           reuse the LAST event_id to test idempotency
 *
 * Examples:
 *   node scripts/publishTestEvent.js project.matched
 *   node scripts/publishTestEvent.js payment.released --project-id my-project-1
 *   node scripts/publishTestEvent.js payment.failed
 *   node scripts/publishTestEvent.js milestone.completed
 *   node scripts/publishTestEvent.js project.matched --duplicate
 *
 * This script connects directly to RabbitMQ using the same env vars as the
 * service.  It does NOT start the full Express/Socket.IO/MongoDB stack.
 *
 * IMPORTANT: For development/testing only. Never run in production.
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import amqplib from 'amqplib';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const RABBITMQ_HOST     = process.env.RABBITMQ_HOST     || 'localhost';
const RABBITMQ_PORT     = process.env.RABBITMQ_PORT     || '5672';
const RABBITMQ_USERNAME = process.env.RABBITMQ_USERNAME || 'guest';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'devcollab.events';

const AMQP_URL = `amqp://${RABBITMQ_USERNAME}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

// Persist the last event_id so --duplicate can reuse it
const LAST_ID_FILE = resolve(__dirname, '.last_test_event_id');

// ── CLI parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Usage: node scripts/publishTestEvent.js <routing-key> [options]

Routing keys:
  project.matched
  payment.released
  payment.failed
  milestone.completed

Options:
  --project-id   <id>   Override projectId
  --workspace-id <id>   Override workspaceId (payment events)
  --event-id     <id>   Override event_id
  --duplicate           Reuse last event_id (tests idempotency)
  `);
  process.exit(0);
}

const routingKey = args[0];
const validKeys  = ['project.matched', 'payment.released', 'payment.failed', 'milestone.completed'];

if (!validKeys.includes(routingKey)) {
  console.error(`❌ Unknown routing key: "${routingKey}"`);
  console.error(`   Valid keys: ${validKeys.join(', ')}`);
  process.exit(1);
}

const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

const isDuplicate    = args.includes('--duplicate');
const overrideId     = getArg('--event-id');
const overrideProject = getArg('--project-id');
const overrideWorkspace = getArg('--workspace-id');

// ── Event ID resolution ───────────────────────────────────────────────────────

let eventId;
if (isDuplicate) {
  if (existsSync(LAST_ID_FILE)) {
    eventId = readFileSync(LAST_ID_FILE, 'utf8').trim();
    console.log(`♻️  Reusing last event_id: ${eventId}  (duplicate test)`);
  } else {
    console.warn('⚠️  No previous event_id found — generating a new one');
    eventId = randomUUID();
  }
} else {
  eventId = overrideId || randomUUID();
}

// ── Payload builders ──────────────────────────────────────────────────────────

const projectId   = overrideProject   || `test-project-${randomUUID().slice(0, 8)}`;
const workspaceId = overrideWorkspace || randomUUID(); // used only in log text for payment events
const milestoneId = randomUUID();
const contractId  = randomUUID();
const studentId   = `student-${randomUUID().slice(0, 8)}`;
const startupId   = `startup-${randomUUID().slice(0, 8)}`;

const PAYLOADS = {
  'project.matched': {
    projectId,
    studentId,
    startupId,
    matchScore: 0.92,
    matchedAt:  new Date().toISOString(),
  },

  'payment.released': {
    project_id:          projectId,
    milestone_id:        milestoneId,
    contract_id:         contractId,
    transaction_id:      `txn-${randomUUID().slice(0, 12)}`,
    student_id:          studentId,
    startup_id:          startupId,
    amount:              500.00,
    currency:            'USD',
    provider_payment_id: `pp-${randomUUID().slice(0, 12)}`,
    status:              'released',
  },

  'payment.failed': {
    project_id:       projectId,
    milestone_id:     milestoneId,
    contract_id:      contractId,
    transaction_id:   `txn-${randomUUID().slice(0, 12)}`,
    amount:           500.00,
    reason:           'Payment declined by provider',
    provider_order_id: `ord-${randomUUID().slice(0, 12)}`,
  },

  'milestone.completed': {
    project_id:       projectId,
    milestone_id:     milestoneId,
    contract_id:      contractId,
    student_id:       studentId,
    amount:           500.00,
    completion_notes: '[TEST] All deliverables submitted and reviewed.',
  },
};

// ── Envelope builder ──────────────────────────────────────────────────────────

const buildEnvelope = (type, payload) => ({
  event_id:    eventId,
  event_type:  type,
  version:     '1',
  occurred_at: new Date().toISOString(),
  producer:    routingKey === 'milestone.completed' ? 'workspace-service' : `test-script-${type}`,
  payload,
});

// ── Publish ───────────────────────────────────────────────────────────────────

const run = async () => {
  let connection, channel;

  try {
    console.log(`\n🐇 Connecting to RabbitMQ at ${RABBITMQ_HOST}:${RABBITMQ_PORT}…`);
    connection = await amqplib.connect(AMQP_URL);
    channel    = await connection.createChannel();

    // Assert the exchange (idempotent — safe to call even if already exists)
    await channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });

    const payload  = PAYLOADS[routingKey];
    const envelope = buildEnvelope(routingKey, payload);
    const buffer   = Buffer.from(JSON.stringify(envelope, null, 2));

    channel.publish(RABBITMQ_EXCHANGE, routingKey, buffer, {
      persistent:  true,
      contentType: 'application/json',
      timestamp:   Date.now(),
    });

    console.log(`\n✅ Published to exchange "${RABBITMQ_EXCHANGE}" with routing key "${routingKey}"`);
    console.log('\nEnvelope:');
    console.log(JSON.stringify(envelope, null, 2));

    // Persist event_id for --duplicate tests
    writeFileSync(LAST_ID_FILE, eventId, 'utf8');
    console.log(`\n💾 event_id saved to ${LAST_ID_FILE}`);
    console.log('   Run with --duplicate to replay the same event_id (idempotency test)\n');

  } catch (err) {
    console.error(`\n❌ Failed to publish event: ${err.message}`);
    console.error('   Is RabbitMQ running? Check RABBITMQ_HOST / RABBITMQ_PORT in .env\n');
    process.exit(1);
  } finally {
    try { if (channel)    await channel.close();        } catch (_) {}
    try { if (connection) await connection.close();     } catch (_) {}
  }
};

run();
