# Person C Event Contract Specifications

This document defines the RabbitMQ event contracts for **Person C — Payment Escrow & Milestone System**, detailing the events consumed from Person A (`Discovery & Matching Service`) and Person B (`Real-Time Collaboration Workspace`), as well as the events published by Person C.

---

## Architecture Overview

```text
Person A (Discovery & Matching)
  │
  │ project.matched
  │ { projectId, studentId, startupId, totalBudget, currency, milestones }
  ▼
Person C (Payment Escrow & Milestone System) ──[creates Escrow Contract]
  │
  ▲
  │ milestone.completed
  │ { projectId, milestoneId, contractId, studentId, amount }
  │
Person B (Real-Time Collaboration Workspace)
  │
  ▲
  │ payment.released / payment.failed
  │ { projectId, milestoneId, contractId, studentId, startupId, amount, providerPaymentId }
  │
Person C (Payment Escrow & Milestone System)
```

---

## 1. Consumed Events

### 1.1 `project.matched`

- **Producer**: Person A (`Discovery & Matching Service`)
- **Exchange**: `devcollab.events` (Topic Exchange)
- **Routing Key**: `project.matched`
- **Queue**: `q.project.matched`
- **Purpose**: Sent when a startup selects an applicant for a project. Triggers the creation of an Escrow Contract shell and initial milestones in Person C.

#### Event Envelope & Payload

```json
{
  "event_id": "evt_a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "event_type": "project.matched",
  "producer": "devcollab-auth",
  "occurred_at": "2026-08-14T10:00:00Z",
  "version": "1.0",
  "payload": {
    "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "startup_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "student_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "project_title": "Full-Stack E-Commerce Platform",
    "project_description": "Build an escrow-enabled marketplace",
    "total_budget": 5000.00,
    "currency": "USD",
    "milestones": [
      {
        "title": "Phase 1: Backend Setup & API Design",
        "description": "Deliver OpenAPI specs & auth endpoints",
        "amount": 2500.00,
        "sequence_order": 1,
        "due_date": "2026-09-01"
      },
      {
        "title": "Phase 2: Payment Escrow & UI Integration",
        "description": "Deliver frontend and payment gateway",
        "amount": 2500.00,
        "sequence_order": 2,
        "due_date": "2026-09-30"
      }
    ]
  }
}
```

#### Consumer Behavior & Rules
1. **Idempotency**: Checks `processed_events` table by `event_id`. If already processed, the consumer ACKs immediately without recreating contracts.
2. **Duplicate Protection**: If an active contract already exists for `project_id`, duplicate creation is prevented (`existsByProjectIdAndStatus`).
3. **Acknowledgment**: Message is acknowledged (`basicAck`) ONLY after contract and milestones are persisted. On unrecoverable error, message is rejected (`basicNack` with requeue=false) to send to Dead Letter Exchange (`devcollab.events.dlx`).

---

### 1.2 `milestone.completed`

- **Producer**: Person B (`Real-Time Collaboration Workspace`)
- **Exchange**: `devcollab.events` (Topic Exchange)
- **Routing Key**: `milestone.completed`
- **Queue**: `q.milestone.completed`
- **Purpose**: Sent when a student completes a milestone deliverable in the workspace. Triggers payment release processing in Person C.

#### Event Envelope & Payload

```json
{
  "event_id": "evt_f9e8d7c6-5432-10fe-dcba-0987654321fe",
  "event_type": "milestone.completed",
  "producer": "workspace-service",
  "occurred_at": "2026-08-14T12:00:00Z",
  "version": "1.0",
  "payload": {
    "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "milestone_id": "98765432-10fe-dcba-0987-654321fedcba",
    "contract_id": "11223344-5566-7788-9900-aabbccddeeff",
    "student_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "completion_notes": "Completed REST API implementation and unit tests",
    "amount": 2500.00
  }
}
```

#### Consumer Behavior & Rules
1. **Idempotency**: Checks `processed_events` by `event_id`.
2. **Amount Verification**: Person C validates the milestone against Person C's own database record. **Person C never blindly trusts Person B's amount.**
3. **State Guard**: If milestone status is already `RELEASED` or `PAYMENT_PROCESSING`, duplicate release execution is skipped.
4. **Execution Flow**:
   - Approves milestone if needed (`status -> APPROVED`).
   - Initiates payment order with configured provider (`PayPal` or `Mock`).
   - On successful payment capture/confirmation, marks milestone as `RELEASED` and publishes `payment.released`.
   - On payment failure, marks milestone as `FAILED` and publishes `payment.failed`.

---

## 2. Published Events

### 2.1 `payment.released`

- **Producer**: Person C (`Payment Escrow & Milestone System`)
- **Exchange**: `devcollab.events` (Topic Exchange)
- **Routing Key**: `payment.released`
- **Consumer**: Person B (`Workspace Service`), Audit/Analytics

#### Event Envelope & Payload

```json
{
  "event_id": "evt_550e8400-e29b-41d4-a716-446655440000",
  "event_type": "payment.released",
  "producer": "escrow-service",
  "occurred_at": "2026-08-14T14:30:00Z",
  "version": "1.0",
  "payload": {
    "milestone_id": "98765432-10fe-dcba-0987-654321fedcba",
    "contract_id": "11223344-5566-7788-9900-aabbccddeeff",
    "student_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "startup_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "amount": 2500.00,
    "currency": "USD",
    "provider_payment_id": "CAPTURE_PAYPAL_998877"
  }
}
```

---

### 2.2 `payment.failed`

- **Producer**: Person C (`Payment Escrow & Milestone System`)
- **Exchange**: `devcollab.events` (Topic Exchange)
- **Routing Key**: `payment.failed`
- **Consumer**: Person B (`Workspace Service`), Audit/Alerting

#### Event Envelope & Payload

```json
{
  "event_id": "evt_660e8400-e29b-41d4-a716-446655441111",
  "event_type": "payment.failed",
  "producer": "escrow-service",
  "occurred_at": "2026-08-14T14:31:00Z",
  "version": "1.0",
  "payload": {
    "transaction_id": "44332211-5566-7788-9900-aabbccddeeff",
    "milestone_id": "98765432-10fe-dcba-0987-654321fedcba",
    "contract_id": "11223344-5566-7788-9900-aabbccddeeff",
    "project_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "amount": 2500.00,
    "reason": "Payment capture rejected by provider: INSTRUMENT_DECLINED"
  }
}
```

---

## 3. Dead Letter Exchange (DLX) & Retry Policy

- **DLX Exchange**: `devcollab.events.dlx` (Direct Exchange)
- **DLX Queue**: `q.dead.letter` (Routing Key: `dead.letter`)
- **Message TTL**: 24 Hours (`86400000` ms)
- **Retry Policy**:
  - Max attempts: 3
  - Initial interval: 1000ms
  - Multiplier: 2.0
