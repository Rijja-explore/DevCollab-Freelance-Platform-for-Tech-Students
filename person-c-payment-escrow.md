# Person C — Payment Escrow & Milestone System

**One-line (share this in your group chat):** Handles escrow contracts, milestone payments, and webhook-verified transactions with strict ACID guarantees using Spring Boot, MySQL, and audit logging.

## Tools & concepts

| Concept | Tool |
|---|---|
| Backend | Java + Spring Boot |
| Database | MySQL |
| Payment provider | Razorpay or Stripe (test mode) |
| Server-to-server notification | Webhook (HMAC-verified) |
| Duplicate-safety | Idempotency keys |
| Traceability | Append-only audit log |
| Deployment | SSH-key-based |
| Messaging | RabbitMQ consumer + producer |

---

## 1. Scope — what you own end to end

- On `project.matched` event: create an escrow contract shell for that project.
- REST API to define milestones and amounts for a contract.
- On `milestone.completed` event from Service B: validate the milestone, initiate a release request to the payment provider.
- Receive the provider's **webhook** confirming the payment actually cleared, update the ledger, then publish `payment.released` (or `payment.failed`).

## 2. Why Spring Boot + Java here specifically (say this in the viva)

Money-handling code benefits most from strong typing (fewer "amount was a string somewhere" bugs) and Spring's `@Transactional` gives you real, mature transaction boundaries around multi-step DB writes (debit + credit + audit row, all-or-nothing). This is also the standard industry stack for backend fintech systems — a deliberate, defensible choice, not "just because."

## 3. Why MySQL / strict ACID (contrast this directly with Person A and B's choices)

Financial state cannot tolerate eventual consistency. If two requests race to release the same milestone payment, you need row-level locking and foreign-key-enforced integrity — not "it'll converge eventually." This is the one service in the whole project that must be **CP**, not AP.

## 4. Database schema (MySQL)

- `contracts(id, project_id, startup_id, student_id, status)`
- `milestones(id, contract_id FK, amount, status)` — status: `pending`, `in_review`, `released`, `failed`
- `transactions(id, milestone_id FK, provider_transaction_id UNIQUE, amount, status, created_at)`
- `audit_log(id, entity_type, entity_id, action, actor, created_at)` — append-only, never updated or deleted, so you always have a full history of every money movement (this is standard fintech practice, and a good LLD artifact to show in your report).

## 5. API contract (REST)

```
POST /api/payments/contracts          { projectId, milestones: [{ amount }] }
GET  /api/payments/contracts/:id
POST /api/payments/milestones/:id/release     (idempotency key required — see below)
```

Response shape example:
```json
{ "milestoneId": "m1", "status": "released", "transactionId": "t1" }
```

**Webhook endpoint (public, bypasses the gateway's normal JWT auth):**
```
POST /api/payments/webhook/razorpay
```
Steps you must implement, in order:
1. Read the raw request body (don't parse first — signature is over the raw bytes).
2. Compute HMAC-SHA256 using your webhook signing secret (from the provider dashboard).
3. Compare to the `X-Razorpay-Signature` header. If it doesn't match, reject with 400 — **never trust an unverified webhook.**
4. Only after verification, update `transactions` and `milestones`, and publish `payment.released`.

## 6. Why a webhook here, and not the client polling you, and not you polling the provider

The provider doesn't know in advance when a payment will actually clear — it could be instant or delayed by bank processing. Polling the provider repeatedly wastes calls and adds latency. A webhook lets the provider notify you exactly once, the moment it happens — this is the correct mechanism for an event whose timing you don't control. (Contrast this explicitly with Person B's WebSocket: webhook is one-way, server-to-server, occasional; WebSocket is bidirectional, persistent, continuous. Same "real-time-ish" goal, opposite mechanism, chosen for opposite reasons — put this on one slide.)

## 7. Idempotency (this is not optional — say why)

Networks retry. If a client (or your own retry logic) calls `POST /milestones/:id/release` twice, you must guarantee the milestone is paid **once**, not twice. Two layers of protection:
- Require an `Idempotency-Key` header on the release endpoint; store keys you've already processed and return the cached result on a repeat.
- A `UNIQUE` constraint on `transactions.provider_transaction_id` as a hard database-level backstop.

Also apply this to RabbitMQ consumption: dedupe on `event_id` from the shared envelope (see shared-contracts.md) before processing `milestone.completed`.

## 8. Events

- **Consume** `project.matched` → create contract shell: `{ projectId, studentId, startupId }`
- **Consume** `milestone.completed` → validate + trigger release: `{ projectId, milestoneId, amount, submittedBy }`
- **Publish** `payment.released`: `{ projectId, milestoneId, transactionId, status }`
- **Publish** `payment.failed`: `{ projectId, milestoneId, reason }`

## 9. Security (this is a real grading point for Unit III — do all of these, not just talk about them)

- SSH-key-only deployment to your server (no password auth).
- Secrets (DB creds, webhook signing secret, provider API keys) via environment variables — never committed to git.
- Firewall rule limiting the MySQL port to internal Docker network only, not exposed publicly.
- Never store raw card numbers — you never touch PCI scope at all, because the provider's test-mode checkout handles card entry. State this explicitly: "we don't need PCI-DSS compliance because we never see card data."
- Rate-limit the release endpoint.

## 10. CAP stance: **CP** (the direct counterpoint to A and B)

If the network partitions, you'd rather a payment request fail cleanly and retry later than risk a double-payment or a corrupted balance. Put this on the same slide as A's and B's AP choice — "our three services deliberately sit on different points of the CAP triangle, matched to what each domain actually needs" is your strongest single sentence in the whole presentation.

## Deliverables checklist

- [ ] Spring Boot REST API (contracts, milestones)
- [ ] MySQL schema + `@Transactional` boundaries
- [ ] Razorpay/Stripe test-mode integration
- [ ] Webhook endpoint with HMAC verification
- [ ] Idempotency key handling
- [ ] Append-only audit log
- [ ] RabbitMQ consumer for `project.matched`, `milestone.completed`
- [ ] RabbitMQ producer for `payment.released`, `payment.failed`
- [ ] SSH-key deploy config + firewall rules documented
- [ ] Dockerfile + compose entry
