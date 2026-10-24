# Person C — Payment Escrow & Milestone System

**One-line (share this in your group chat):** Handles escrow contracts, multi-stage milestone release workflows, automated payment reminder scheduling, and webhook-verified transactions with strict ACID guarantees using Spring Boot, MySQL, and audit logging.

## Tools & concepts

| Concept | Tool |
|---|---|
| Backend | Java + Spring Boot 3 (`@EnableScheduling`, `@Transactional`) |
| Database | MySQL 8.0 + Flyway Migrations |
| Payment provider | PayPal Sandbox / Razorpay or Stripe (test mode) |
| Server-to-server notification | Webhook (HMAC / Cryptographic signature-verified) |
| Duplicate-safety | Idempotency keys |
| Traceability | Append-only audit log |
| Background scheduling | Spring `@Scheduled` Payment Reminder Scheduler |
| Deployment | SSH-key-based / Docker Compose |
| Messaging | RabbitMQ consumer + producer |

---

## 1. Scope — what you own end to end

- On `project.matched` event: create an escrow contract shell for that project.
- REST API to define milestones, due dates, and amounts for a contract.
- **Milestone-Based Release Workflow**: multi-step state machine (`PENDING` → `IN_PROGRESS` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `CHANGES_REQUESTED` → `RELEASED`) supporting student deliverable URLs/notes, startup review feedback, revision requests, and PayPal/direct escrow release.
- **Payment Reminder Scheduler**: automated background scheduler scanning active milestones for upcoming deadlines (`DUE_SOON`), past-due deliverables (`OVERDUE`), and unreviewed submissions (`REVIEW_PENDING`) with cooldown deduplication, manual trigger support, and RabbitMQ notifications.
- On `milestone.completed` event from Service B (or direct approval in the workflow): validate the milestone, initiate a release request to the payment provider.
- Receive the provider's **webhook** confirming the payment actually cleared, update the ledger, then publish `payment.released` (or `payment.failed`).

## 2. Why Spring Boot + Java here specifically (say this in the viva)

Money-handling code benefits most from strong typing (fewer "amount was a string somewhere" bugs) and Spring's `@Transactional` gives you real, mature transaction boundaries around multi-step DB writes (debit + credit + audit row, all-or-nothing). This is also the standard industry stack for backend fintech systems — a deliberate, defensible choice, not "just because."

## 3. Why MySQL / strict ACID (contrast this directly with Person A and B's choices)

Financial state cannot tolerate eventual consistency. If two requests race to release the same milestone payment, you need row-level locking and foreign-key-enforced integrity — not "it'll converge eventually." This is the one service in the whole project that must be **CP**, not AP.

## 4. Database schema (MySQL)

- `contracts(id, project_id, startup_id, student_id, total_amount, currency, status)`
- `milestones(id, contract_id FK, title, description, amount, status, due_date, sequence_order, deliverable_url, submission_notes, review_feedback, submitted_at, reviewed_at, released_at)` — status: `PENDING`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `RELEASED`, `FAILED`, `CANCELLED`
- `transactions(id, milestone_id FK, provider_transaction_id UNIQUE, idempotency_key UNIQUE, amount, status, created_at)`
- `payment_reminders(id, milestone_id FK, contract_id FK, project_id, reminder_type, recipient_id, recipient_role, title, message, status, dismissed, scheduled_for, sent_at, created_at)` — tracks `DUE_SOON`, `OVERDUE`, `REVIEW_PENDING`, and `MANUAL_NUDGE` reminders with cooldown indexing.
- `audit_log(id, entity_type, entity_id, action, actor_id, old_state, new_state, created_at)` — append-only, never updated or deleted, so you always have a full history of every money movement and milestone state transition (this is standard fintech practice, and a good LLD artifact to show in your report).

## 5. API contract (REST)

```
POST /api/payments/contracts                       { projectId, milestones: [{ amount, dueDate }] }
GET  /api/payments/contracts/:id
POST /api/payments/milestones/:id/release          (idempotency key required — see below)
```

### Milestone-Based Release Workflow Endpoints (`/api/v1/milestones`)
```
POST /api/v1/milestones/{id}/start                 (Student transitions PENDING / CHANGES_REQUESTED → IN_PROGRESS)
POST /api/v1/milestones/{id}/submit                (Student submits deliverableUrl & submissionNotes → SUBMITTED)
POST /api/v1/milestones/{id}/review                (Startup approves → APPROVED or requests changes → CHANGES_REQUESTED with reviewFeedback)
POST /api/v1/milestones/{id}/release               (Initiates PayPal Sandbox Order with Idempotency-Key and returns approveUrl)
POST /api/v1/milestones/{id}/capture               (Captures approved PayPal Order and transitions to RELEASED)
POST /api/v1/milestones/{id}/release-direct        (Direct escrow release after approval with full transaction + audit log)
GET  /api/v1/contracts/{contractId}/workflow-summary (Progress breakdown: total/released/pending amounts, counts by state, completion %)
```

### Payment Reminder Scheduler Endpoints (`/api/v1/reminders`)
```
GET  /api/v1/reminders                             (Filter by recipientId, contractId, or milestoneId)
GET  /api/v1/reminders/summary                     (Counts for dueSoon, overdue, reviewPending, totalSent, unreadCount)
POST /api/v1/reminders/scan                        (On-demand trigger of the scheduled reminder check)
POST /api/v1/reminders/milestones/{id}/send        (Send an immediate manual payment/review nudge for a milestone)
POST /api/v1/reminders/{id}/dismiss                (Mark a reminder notification as dismissed/read)
```

Response shape example:
```json
{ "milestoneId": "m1", "status": "released", "transactionId": "t1" }
```

**Webhook endpoint (public, bypasses the gateway's normal JWT auth):**
```
POST /api/payments/webhook/razorpay
POST /api/v1/webhooks/paypal
```
Steps you must implement, in order:
1. Read the raw request body (don't parse first — signature is over the raw bytes).
2. Compute HMAC-SHA256 using your webhook signing secret (from the provider dashboard).
3. Compare to the signature header. If it doesn't match, reject with 400 — **never trust an unverified webhook.**
4. Only after verification, update `transactions` and `milestones`, and publish `payment.released`.

## 6. Newly Implemented Features (Final Review Progress)

### 6.1 Milestone-Based Release Workflow
- **End-to-End Multi-Stage State Machine**:
  1. **Start Work (`IN_PROGRESS`)**: Student begins work on a `PENDING` or `CHANGES_REQUESTED` milestone.
  2. **Submit Deliverable (`SUBMITTED`)**: Student attaches a deliverable URL (e.g., GitHub PR, deployment preview) and submission notes; records `submitted_at` timestamp and publishes `milestone.submitted`.
  3. **Startup Review (`APPROVED` / `CHANGES_REQUESTED`)**: Startup inspects the deliverable and either approves it for payout or requests revisions with structured `review_feedback`; records `reviewed_at` and publishes `milestone.reviewed`.
  4. **Escrow Release (`RELEASED`)**: Once approved (or released directly by the startup), `MilestoneService` creates an idempotent transaction record, captures the PayPal order (or executes direct release), updates the parent contract status to `COMPLETED` once all milestones are `RELEASED`, writes an immutable `AuditLog` entry, and publishes `payment.released`.
- **Contract Workflow Summary**: Calculates real-time financial and stage metrics (`releasedAmount`, `approvedAmount`, `pendingAmount`, stage counts, and `completionPercentage`) for the visual workflow stepper in the frontend.

### 6.2 Payment Reminder Scheduler
- **Automated Background Cron (`PaymentReminderScheduler`)**:
  - Runs automatically on a configurable schedule (`app.scheduler.payment-reminder-cron`, default every 6 hours) and can also be triggered manually from the UI (`POST /api/v1/reminders/scan`).
  - Evaluates all unreleased milestones across active contracts for three conditions:
    - **`DUE_SOON`**: Milestone deadline is within the configurable lookahead window (default 3 days) and work is not yet submitted.
    - **`OVERDUE`**: Milestone `due_date` has passed without submission/release.
    - **`REVIEW_PENDING`**: Student submitted deliverables (`SUBMITTED` / `UNDER_REVIEW`) and the startup has not reviewed within the SLA window (default 48 hours).
  - **Cooldown Deduplication**: Checks `payment_reminders` for recent alerts of the same `reminder_type` within the 24-hour cooldown window to prevent notification spam.
  - **Event Publishing & Audit Trail**: Persists reminder records in MySQL, logs to `audit_log`, and publishes `payment.reminder` events to RabbitMQ.

## 7. Why a webhook here, and not the client polling you, and not you polling the provider

The provider doesn't know in advance when a payment will actually clear — it could be instant or delayed by bank processing. Polling the provider repeatedly wastes calls and adds latency. A webhook lets the provider notify you exactly once, the moment it happens — this is the correct mechanism for an event whose timing you don't control. (Contrast this explicitly with Person B's WebSocket: webhook is one-way, server-to-server, occasional; WebSocket is bidirectional, persistent, continuous. Same "real-time-ish" goal, opposite mechanism, chosen for opposite reasons — put this on one slide.)

## 8. Idempotency (this is not optional — say why)

Networks retry. If a client (or your own retry logic) calls `POST /milestones/:id/release` twice, you must guarantee the milestone is paid **once**, not twice. Two layers of protection:
- Require an `Idempotency-Key` header on the release endpoint; store keys you've already processed and return the cached result on a repeat.
- A `UNIQUE` constraint on `transactions.provider_transaction_id` as a hard database-level backstop.

Also apply this to RabbitMQ consumption: dedupe on `event_id` from the shared envelope (see shared-contracts.md) before processing `milestone.completed`.

## 9. Events

- **Consume** `project.matched` → create contract shell: `{ projectId, studentId, startupId }`
- **Consume** `milestone.completed` → validate + trigger release: `{ projectId, milestoneId, amount, submittedBy }`
- **Publish** `milestone.submitted`: `{ milestoneId, contractId, projectId, deliverableUrl }`
- **Publish** `milestone.reviewed`: `{ milestoneId, contractId, projectId, approved, feedback }`
- **Publish** `payment.released`: `{ projectId, milestoneId, transactionId, status }`
- **Publish** `payment.failed`: `{ projectId, milestoneId, reason }`
- **Publish** `payment.reminder`: `{ reminderId, milestoneId, contractId, projectId, reminderType, recipientId, recipientRole, message }`

## 10. Security (this is a real grading point for Unit III — do all of these, not just talk about them)

- SSH-key-only deployment to your server (no password auth).
- Secrets (DB creds, webhook signing secret, provider API keys) via environment variables — never committed to git.
- Firewall rule limiting the MySQL port to internal Docker network only, not exposed publicly.
- Never store raw card numbers — you never touch PCI scope at all, because the provider's test-mode checkout handles card entry. State this explicitly: "we don't need PCI-DSS compliance because we never see card data."
- Rate-limit the release endpoint.

## 11. CAP stance: **CP** (the direct counterpoint to A and B)

If the network partitions, you'd rather a payment request fail cleanly and retry later than risk a double-payment or a corrupted balance. Put this on the same slide as A's and B's AP choice — "our three services deliberately sit on different points of the CAP triangle, matched to what each domain actually needs" is your strongest single sentence in the whole presentation.

## Deliverables checklist

- [x] Spring Boot REST API (contracts, milestones, workflow summary, payment reminders)
- [x] MySQL schema + Flyway migrations (`V1`–`V10`) + `@Transactional` boundaries
- [x] Milestone-Based Release Workflow (start, submit deliverables, approve/request changes, release, workflow summary)
- [x] Payment Reminder Scheduler (`@Scheduled` cron + manual scan, `DUE_SOON` / `OVERDUE` / `REVIEW_PENDING` detection, cooldown deduplication)
- [x] PayPal Sandbox / Razorpay / Stripe test-mode integration
- [x] Webhook endpoint with cryptographic / HMAC verification
- [x] Idempotency key handling
- [x] Append-only audit log
- [x] RabbitMQ consumer for `project.matched`, `milestone.completed`
- [x] RabbitMQ producer for `payment.released`, `payment.failed`, `milestone.submitted`, `milestone.reviewed`, `payment.reminder`
- [x] SSH-key deploy config + firewall rules documented
- [x] Dockerfile + compose entry
