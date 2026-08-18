# Phase 8 — RabbitMQ Event-Driven Integration

> **Service:** Workspace Service  
> **Phase:** 8  
> **Exchange:** `devcollab.events` (topic, durable)  
> **Protocol:** AMQP 0-9-1 via `amqplib`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Event Envelope](#2-event-envelope)
3. [Exchange & Queues](#3-exchange--queues)
4. [Consumed Events](#4-consumed-events)
5. [Published Events](#5-published-events)
6. [Idempotency](#6-idempotency)
7. [Error Handling & Retry](#7-error-handling--retry)
8. [Socket.IO Integration](#8-socketio-integration)
9. [Configuration Reference](#9-configuration-reference)
10. [File Structure](#10-file-structure)
11. [Testing Guide](#11-testing-guide)
12. [Current Limitations](#12-current-limitations)
13. [Future Integration — Person A](#13-future-integration--person-a)
14. [Future Integration — Person C](#14-future-integration--person-c)

---

## 1. Architecture Overview

```
Person A (Discovery & Matching)
  └── publishes → devcollab.events [project.matched]
                        │
                        ▼
          workspace-service.project.matched  (queue)
                        │
                        ▼
              projectMatchedHandler.js
                        │
                        ▼
              Workspace.create() in MongoDB

Person C (Payment / Escrow)
  └── publishes → devcollab.events [payment.released]
                        │
                        ▼
        workspace-service.payment.released  (queue)
                        │
                        ▼
            paymentReleasedHandler.js
                        │
                ┌───────┴───────┐
                ▼               ▼
         Message.save()   socketEmitter.emitMessageCreated()
         (SYSTEM type)    → workspace room via Socket.IO

  └── publishes → devcollab.events [payment.failed]
                        │
                        ▼
         workspace-service.payment.failed  (queue)
                        │
                        ▼
             paymentFailedHandler.js
                        │
                ┌───────┴───────┐
                ▼               ▼
         Message.save()   socketEmitter.emitMessageCreated()
         (SYSTEM type)    → workspace room via Socket.IO

Workspace Service (this service)
  └── publishes → devcollab.events [milestone.completed]
        Triggered by:  POST /api/milestones/:id/complete
        Consumed by:   Person C
```

The RabbitMQ layer is isolated from the HTTP layer:

```
HTTP Request
  └── Route → Middleware → Controller → Service → Model
                                           │
                                     (milestone only)
                                           ▼
                                    publisher.js
                                           │
                                           ▼
                                 devcollab.events exchange
```

Consumers run independently of the HTTP request cycle. They are started once
at server boot and run for the lifetime of the process.

---

## 2. Event Envelope

All events — both consumed and published — use the shared DevCollab envelope:

```json
{
  "event_id":    "550e8400-e29b-41d4-a716-446655440000",
  "event_type":  "project.matched",
  "version":     "1",
  "occurred_at": "2026-08-18T10:00:00.000Z",
  "producer":    "workspace-service",
  "payload":     {}
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_id` | UUID v4 string | Yes | Used for deduplication |
| `event_type` | string | Yes | Matches the routing key |
| `version` | string | Yes | Always `"1"` currently |
| `occurred_at` | ISO-8601 string | Yes | UTC timestamp |
| `producer` | string | Yes | Service name of the publisher |
| `payload` | object | Yes | Event-specific business data |

---

## 3. Exchange & Queues

### Exchange

| Property | Value |
|----------|-------|
| Name | `devcollab.events` |
| Type | `topic` |
| Durable | `true` |

### Consumer Queues (owned by Workspace Service)

| Queue Name | Routing Key | Durable | Publisher |
|-----------|-------------|---------|-----------|
| `workspace-service.project.matched` | `project.matched` | Yes | Person A |
| `workspace-service.payment.released` | `payment.released` | Yes | Person C |
| `workspace-service.payment.failed` | `payment.failed` | Yes | Person C |

Each queue is asserted at startup with `durable: true` and bound to
`devcollab.events` using its routing key. The Workspace Service owns these
queues — Person A and C publish to the exchange and do not need to know about
the Workspace Service's queue names.

### Published Routing Keys (Workspace Service as producer)

| Routing Key | Consumed By | Trigger |
|-------------|-------------|---------|
| `milestone.completed` | Person C | `POST /api/milestones/:id/complete` |

---

## 4. Consumed Events

### 4.1 `project.matched`

Published by Person A when a student-startup match is confirmed.

**Handler:** `src/messaging/handlers/projectMatchedHandler.js`

**Payload:**

```json
{
  "projectId": "my-project-alpha",
  "studentId": "student-uuid",
  "startupId": "startup-uuid",
  "matchScore": 0.92,
  "matchedAt": "2026-08-18T10:00:00.000Z"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `projectId` | **Yes** | Alphanumeric + hyphens/underscores; case-insensitive (stored lowercase) |
| `studentId` | **Yes** | Opaque string |
| `startupId` | **Yes** | Opaque string |
| `matchScore` | No | Tolerated but not stored |
| `matchedAt` | No | Tolerated but not stored |

**Processing:**
1. Validate `projectId`, `studentId`, `startupId` are present.
2. Check Redis for duplicate `event_id`.
3. Query `Workspace.findByProjectId(projectId)` — if exists, skip creation.
4. Create `Workspace` document in MongoDB.
5. Mark `event_id` in Redis (7-day TTL).
6. Ack the message.

**Idempotency guarantee:** A duplicate event with the same `event_id` OR a
second match for the same `projectId` will both result in zero duplicate
workspaces.

---

### 4.2 `payment.released`

Published by Person C when escrow payment has been released to the student.

**Handler:** `src/messaging/handlers/paymentReleasedHandler.js`

**Payload:**

```json
{
  "project_id":          "my-project-alpha",
  "milestone_id":        "milestone-uuid",
  "contract_id":         "contract-uuid",
  "transaction_id":      "txn-abc123",
  "student_id":          "student-uuid",
  "startup_id":          "startup-uuid",
  "amount":              500.00,
  "currency":            "USD",
  "provider_payment_id": "pp-xyz789",
  "status":              "released"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `project_id` | **Yes** | Used to look up the workspace |
| `milestone_id` | **Yes** | Included in system message |
| `contract_id` | **Yes** | — |
| `transaction_id` | **Yes** | Included in system message |
| `student_id` | **Yes** | — |
| `startup_id` | **Yes** | — |
| `amount` | **Yes** | Non-negative number |
| `currency` | **Yes** | Included in system message |
| `provider_payment_id` | No | — |
| `status` | No | Expected `"released"` |

**Processing:**
1. Validate required fields.
2. Check Redis for duplicate `event_id`.
3. `Workspace.findByProjectId(project_id)` — if not found, log error and mark processed (no retry loop).
4. Create `Message` document (`type: SYSTEM`, `senderId: "system"`).
5. `socketEmitter.emitMessageCreated()` → broadcasts to `workspace_<workspaceId>` room.
6. Mark `event_id` in Redis.
7. Ack.

**System message example:**
```
💸 Milestone payment released. Amount: USD 500.00. Milestone: milestone-uuid. Transaction: txn-abc123.
```

---

### 4.3 `payment.failed`

Published by Person C when a milestone payment attempt fails.

**Handler:** `src/messaging/handlers/paymentFailedHandler.js`

**Payload:**

```json
{
  "project_id":        "my-project-alpha",
  "milestone_id":      "milestone-uuid",
  "contract_id":       "contract-uuid",
  "transaction_id":    "txn-abc123",
  "amount":            500.00,
  "reason":            "Payment declined by provider",
  "provider_order_id": "ord-xyz789"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `project_id` | **Yes** | — |
| `milestone_id` | **Yes** | — |
| `contract_id` | **Yes** | — |
| `amount` | **Yes** | Non-negative number |
| `reason` | **Yes** | Included in system message |
| `transaction_id` | No | May not exist if payment never reached provider |
| `provider_order_id` | No | — |

**System message example:**
```
⚠️ Milestone payment failed. Amount: USD 500.00. Milestone: milestone-uuid. Reason: Payment declined by provider.
```

---

## 5. Published Events

### 5.1 `milestone.completed`

Published by the Workspace Service when a milestone is marked complete.

**Trigger:** `POST /api/milestones/:milestoneId/complete`

**Publisher:** `src/messaging/publisher.js → publishMilestoneCompleted()`

**Full envelope:**

```json
{
  "event_id":    "550e8400-e29b-41d4-a716-446655440000",
  "event_type":  "milestone.completed",
  "version":     "1",
  "occurred_at": "2026-08-18T10:00:00.000Z",
  "producer":    "workspace-service",
  "payload": {
    "project_id":       "my-project-alpha",
    "milestone_id":     "milestone-uuid",
    "contract_id":      "contract-uuid",
    "student_id":       "student-uuid",
    "amount":           500.00,
    "completion_notes": "All deliverables submitted and reviewed."
  }
}
```

**Payload fields:**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `project_id` | string | `milestone.projectId` | — |
| `milestone_id` | string | `milestone._id` | MongoDB ObjectId as string |
| `contract_id` | string | `milestone.contractId` | Supplied when milestone was created |
| `student_id` | string | `milestone.studentId` | Copied from workspace at milestone creation |
| `amount` | number | `milestone.amount` | Payment value Person C should release |
| `completion_notes` | string \| null | request body | Optional |

**HTTP trigger:**

```http
POST /api/milestones/:milestoneId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "completionNotes": "All deliverables submitted."
}
```

Response:

```json
{
  "success": true,
  "data": { ...milestoneDocument },
  "eventPublished": true
}
```

`eventPublished: false` means the DB write succeeded but the RabbitMQ publish
failed (broker unavailable). The milestone is still marked complete. Re-publish
manually using the test script or by calling the endpoint again (which will
return `400 Milestone is already completed`; you'd need a dedicated
re-publish endpoint — acceptable future work).

---

## 6. Idempotency

Every consumed event is deduplicated using its `event_id` before any business
logic runs.

**Storage:** Redis key `dedup:workspace:<event_id>`  
**TTL:** 7 days  
**Behaviour on duplicate:**
- Handler returns `{ duplicate: true }`.
- Consumer acks the message immediately (safe to discard — already processed).
- Nothing is written to MongoDB.
- Log line: `Duplicate event_id=<id> — skipping`.

This protects against:
- RabbitMQ at-least-once delivery redelivering an already-processed message.
- Network issues causing the consumer to reconnect and re-receive messages.
- Person A or C accidentally publishing the same event twice.

**Second-level idempotency (project.matched only):**  
Even if Redis is unavailable, `Workspace.findByProjectId()` is called before
`Workspace.save()`. The unique index on `projectId` in MongoDB provides a
final safety net against duplicate workspace creation.

---

## 7. Error Handling & Retry

### Ack policy

| Condition | Action |
|-----------|--------|
| Processing succeeded (including duplicate skip) | `channel.ack()` |
| JSON parse failure | `channel.nack(requeue=false)` — bad data, will not improve on retry |
| Handler throws on first delivery | `channel.nack(requeue=true)` — try once more |
| Handler throws on redelivery | `channel.nack(requeue=false)` — prevent infinite loop, message dropped |

### Connection failure

`rabbitmq.js` handles unexpected connection close with a 5-second reconnect
loop. The consumer queues are re-asserted and re-bound after reconnect via
`startConsumers()` — currently `startConsumers()` is only called at startup.
If the broker goes down while the service is running, messages are held in the
durable queues and will be consumed after the broker recovers and the
channel-close event triggers a reconnect. For a full reconnect + re-subscribe
cycle, a service restart is the safe fallback.

### Startup failure

If RabbitMQ is unavailable at startup, `connectRabbitMQ()` retries 5 times
with 2-second incremental delays. If all 5 attempts fail the process exits with
code 1 (same behaviour as MongoDB/Redis failures).

---

## 8. Socket.IO Integration

The RabbitMQ handlers reuse the **existing Phase 5 Socket.IO implementation**
without modification. No new Socket.IO logic was introduced.

Flow for `payment.released` and `payment.failed`:

```
RabbitMQ message received
  ↓
Handler validates + deduplicates
  ↓
Message.save() — creates SYSTEM message in MongoDB
  ↓
socketEmitter.emitMessageCreated(workspaceId, message)
  ↓
io.to('workspace_<workspaceId>').emit('message-created', messageDoc)
  ↓
All connected clients in the workspace room receive the event
```

Clients listen for `message-created` and filter on `type === 'SYSTEM'` to
distinguish automated system messages from user messages.

---

## 9. Configuration Reference

### Required environment variables (Phase 8 additions)

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_HOST` | `localhost` | RabbitMQ broker hostname |
| `RABBITMQ_PORT` | `5672` | AMQP port |
| `RABBITMQ_USERNAME` | `guest` | Broker username |
| `RABBITMQ_PASSWORD` | `guest` | Broker password |
| `RABBITMQ_EXCHANGE` | `devcollab.events` | Shared topic exchange name |

All five are validated at startup. Missing any one causes `process.exit(1)`.

### Docker / local setup

**RabbitMQ with management UI:**
```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

Management UI: http://localhost:15672 (guest / guest)

---

## 10. File Structure

```
backend/
├── src/
│   ├── messaging/                       ← NEW (Phase 8)
│   │   ├── rabbitmq.js                  connection + channel + exchange
│   │   ├── publisher.js                 publishMilestoneCompleted()
│   │   ├── consumer.js                  queue setup + message dispatch
│   │   └── handlers/
│   │       ├── projectMatchedHandler.js
│   │       ├── paymentReleasedHandler.js
│   │       └── paymentFailedHandler.js
│   ├── models/
│   │   ├── Milestone.js                 NEW — minimal milestone schema
│   │   └── index.js                     updated to export Milestone
│   ├── services/
│   │   └── milestoneService.js          NEW — createMilestone, completeMilestone
│   ├── controllers/
│   │   └── milestoneController.js       NEW
│   ├── routes/
│   │   ├── milestones.js                NEW
│   │   └── index.js                     updated to mount milestonesRouter
│   ├── validators/
│   │   ├── milestoneValidator.js        NEW
│   │   └── index.js                     updated
│   └── config/
│       └── environment.js               updated — RABBITMQ_* vars required
├── server.js                            updated — RabbitMQ init in startup
└── scripts/
    └── publishTestEvent.js              NEW — mock event publisher
```

**Unchanged files** (all existing REST, JWT, Socket.IO, auth middleware):
- `src/middleware/authMiddleware.js`
- `src/middleware/socketAuthMiddleware.js`
- `src/sockets/`
- `src/utils/socketEmitter.js`
- `src/utils/jwt.js`
- `src/config/redis.js`
- `src/config/database.js`
- `src/controllers/workspaceController.js`
- `src/controllers/messageController.js`
- `src/controllers/commentController.js`
- `src/routes/workspaces.js`
- `src/routes/messages.js`
- `src/routes/comments.js`

---

## 11. Testing Guide

### Prerequisites

```bash
# Start infrastructure
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6

docker run -d --name redis -p 6379:6379 redis:7

docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management

# Start the service (in backend/)
npm run dev
```

### Test 1 — project.matched creates a workspace

```bash
node scripts/publishTestEvent.js project.matched
```

Expected log output:
```
[projectMatchedHandler] Workspace created: id=<id> projectId="test-project-..." ...
```

Verify in MongoDB:
```js
db.workspaces.findOne({ projectId: "test-project-..." })
```

### Test 2 — Duplicate project.matched does NOT create another workspace

```bash
node scripts/publishTestEvent.js project.matched --duplicate
```

Expected log:
```
[projectMatchedHandler] Duplicate event_id=<same-id> — skipping
```

MongoDB should still have exactly one workspace document for that projectId.

### Test 3 — payment.released creates a system message

First ensure a workspace exists for the projectId used in the event.
The easiest way is to note the `projectId` from Test 1 and pass it:

```bash
node scripts/publishTestEvent.js payment.released --project-id test-project-<id-from-test-1>
```

Expected log:
```
[paymentReleasedHandler] System message created in workspace <workspaceId>
```

Verify via REST:
```http
GET /api/workspaces/<workspaceId>/messages
Authorization: Bearer <token>
```

The last message should have `type: "SYSTEM"` and text starting with `💸 Milestone payment released`.

### Test 4 — Duplicate payment.released does NOT create another message

```bash
node scripts/publishTestEvent.js payment.released --duplicate
```

Expected log: `Duplicate event_id=... — skipping`  
Message count in workspace should be unchanged.

### Test 5 — payment.failed creates a system message

```bash
node scripts/publishTestEvent.js payment.failed --project-id test-project-<id-from-test-1>
```

Expected: SYSTEM message with text starting `⚠️ Milestone payment failed`.

### Test 6 — Duplicate payment.failed does NOT create another message

```bash
node scripts/publishTestEvent.js payment.failed --duplicate
```

Expected: `Duplicate event_id=... — skipping`

### Test 7 — milestone.completed is published correctly

First create a milestone via REST (requires a running service and valid JWT):

```bash
# Create milestone
curl -s -X POST http://localhost:5000/api/workspaces/<workspaceId>/milestones \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"contractId":"contract-001","title":"MVP Delivery","amount":500}'

# Complete it (publishes milestone.completed to RabbitMQ)
curl -s -X POST http://localhost:5000/api/milestones/<milestoneId>/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"completionNotes":"All deliverables submitted."}'
```

Verify in RabbitMQ management UI (http://localhost:15672):
- Exchange `devcollab.events` shows a spike in publish rate.

Or inspect the message directly by publishing via the test script and
checking the console output — the full envelope is printed.

### Test 8 — Envelope shape verification

```bash
node scripts/publishTestEvent.js milestone.completed
```

The script prints the full envelope. Confirm:
- `event_id` is a valid UUID v4.
- `event_type` is `"milestone.completed"`.
- `version` is `"1"`.
- `producer` is `"workspace-service"`.
- `payload` contains `project_id`, `milestone_id`, `contract_id`, `student_id`, `amount`.

### Test 9 — Socket.IO clients receive payment system messages

Open two terminal windows:

**Terminal 1:** Start the service.

**Terminal 2:** Use the existing `scripts/testSocketIO.js` (or a Socket.IO
client) to connect and join a workspace room:
```js
socket.emit('join-workspace', { workspaceId: '<id>' });
socket.on('message-created', (msg) => console.log('Received:', msg));
```

**Terminal 3:** Publish a payment.released or payment.failed event.

The Socket.IO client should log the incoming `message-created` event with
`type: "SYSTEM"` within milliseconds.

### Test 10 — RabbitMQ connection failure is logged gracefully

Stop the RabbitMQ container while the service is running:
```bash
docker stop rabbitmq
```

Expected: The service logs `RabbitMQ: connection closed unexpectedly — will reconnect in 5s`.  
The HTTP REST API and Socket.IO continue working normally.

Restart RabbitMQ:
```bash
docker start rabbitmq
```

Expected: `RabbitMQ: connection established` — reconnect succeeds automatically.

### Test 11 — Existing REST APIs still work

```bash
# Health check
curl http://localhost:5000/health

# Workspace lookup (requires valid JWT)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/workspaces/<id>
```

### Test 12 — JWT authentication still works

```bash
# No token → 401
curl -s http://localhost:5000/api/workspaces/<id>
# Expected: { "success": false, "message": "Authorization header is missing" }
```

---

## 12. Current Limitations

### 1. Person A's `project.matched` publisher is not yet implemented

The Workspace Service is ready to consume `project.matched` events the moment
Person A's publisher goes live. No changes to the Workspace Service are needed.

Until then, use the test script to simulate the event:
```bash
node scripts/publishTestEvent.js project.matched --project-id <real-project-id>
```

### 2. Person A's production JWT/JWKS key is not yet finalised

The service currently uses a temporary RS256 key pair in `keys/`. JWT
verification is fully implemented and will work transparently once Person A
provides the production public key. See `WORKSPACE_INTEGRATION_GUIDE.md §2`
for the exact switchover steps.

### 3. Person C's payment event publishers are not yet implemented

Both `payment.released` and `payment.failed` consumers are live and waiting.
Person C only needs to publish to `devcollab.events` using the routing keys
and payloads documented in §4.2 and §4.3 above. No Workspace Service changes
are needed.

### 4. RabbitMQ does not automatically re-subscribe after broker restart

The current reconnect logic re-establishes the connection and channel but does
not call `startConsumers()` again. For a clean recovery after a full broker
restart, a service restart is the safe option. A full reconnect+resubscribe
loop is straightforward future work in `rabbitmq.js`.

---

## 13. Future Integration — Person A

When Person A's Discovery & Matching Service is ready to publish
`project.matched`:

1. **No Workspace Service code changes required** — the queue is live and
   waiting.
2. Person A must publish to exchange `devcollab.events` with routing key
   `project.matched`.
3. The payload must include `projectId`, `studentId`, and `startupId`.
4. The full envelope (with `event_id`) must be included so deduplication works.
5. When Person A provides the production RS256 public key:
   - Copy the PEM file to the server.
   - Set `JWT_PUBLIC_KEY_PATH` in `.env`.
   - Restart the Workspace Service.
   - Only `keys/public.pem` and `.env` change — no code changes.

---

## 14. Future Integration — Person C

When Person C's Payment / Escrow Service is ready:

### Receiving `milestone.completed`

1. Subscribe to `devcollab.events` with routing key `milestone.completed`.
2. Create a consumer queue (e.g. `payment-service.milestone.completed`).
3. Bind it to `devcollab.events` with routing key `milestone.completed`.
4. The Workspace Service publishes the envelope documented in §5.1.
5. Person C's handler should release the escrow payment for the amount in
   `payload.amount` to the student in `payload.student_id`.
6. **No Workspace Service changes required.**

### Publishing `payment.released` and `payment.failed`

1. Publish to `devcollab.events` using the payloads in §4.2 and §4.3.
2. The Workspace Service queues are already live and bound.
3. Every event must include a unique `event_id` UUID for deduplication.
4. **No Workspace Service changes required.**

### Important: RabbitMQ is the integration mechanism

Person C must **not** call any Workspace Service REST endpoint to create
payment system messages. The `payment.released` and `payment.failed` RabbitMQ
events are the only supported integration path. The system messages in the
workspace chat are created exclusively by the consumer handlers.
