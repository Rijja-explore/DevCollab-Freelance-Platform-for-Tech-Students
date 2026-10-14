
# DevCollab — Shared Integration Contracts

**Read this before writing any code.** This is the glue between all three services. If everyone follows this exactly, integration at the end will just work — no last-minute API mismatches.

---

## 1. API Gateway routing (Nginx)

| Path prefix | Routes to | Protocol |
|---|---|---|
| `/api/discovery/*` | Service A | GraphQL (single endpoint `/api/discovery/graphql`) |
| `/api/workspace/*` | Service B | REST |
| `/ws/workspace` | Service B | WebSocket (Socket.io) |
| `/api/payments/*` | Service C | REST |
| `/api/payments/webhook/*` | Service C | REST — public, bypasses gateway auth, verified via HMAC signature instead |

Gateway does TLS termination, and forwards the `Authorization` header untouched to all three services.

## 2. Authentication (shared across all three services)

- **Service A owns identity.** It's the natural home since it already stores user profiles. On signup/login, A issues a **JWT signed with RS256** (asymmetric — private key stays only in A).
- A exposes a public JWKS endpoint: `GET /api/discovery/.well-known/jwks.json`. Services B and C fetch and cache A's public key from here to verify tokens **without needing a shared secret** — this is the actual reason to use RS256 over HS256: B and C can verify signatures independently, and a leak in B or C's code can never let someone forge tokens, because they never hold the signing key.
- JWT payload: `{ "sub": "<userId>", "role": "student|startup", "iat": ..., "exp": ... }`
- Sent as `Authorization: Bearer <token>` on REST and GraphQL calls, and as `{ auth: { token } }` in the Socket.io connection handshake.

## 3. Event bus (RabbitMQ)

- One topic exchange: `devcollab.events`. Each service declares its **own** durable queue and binds it to only the routing keys it needs.
- **Every event uses this envelope** — no exceptions, so any service can log/debug any event uniformly:

```json
{
  "event_id": "uuid-v4",
  "event_type": "project.matched",
  "version": 1,
  "occurred_at": "2026-07-12T10:15:00Z",
  "producer": "discovery-service",
  "payload": { }
}
```

| Event (routing key) | Published by | Consumed by | Payload |
|---|---|---|---|
| `project.matched` | A | B, C | `{ projectId, studentId, startupId }` |
| `milestone.completed` | B | C | `{ projectId, milestoneId, amount, submittedBy }` |
| `payment.released` | C | A, B | `{ projectId, milestoneId, transactionId, status }` |
| `payment.failed` | C | B | `{ projectId, milestoneId, reason }` |

- **Idempotency requirement for every consumer:** RabbitMQ can redeliver a message. Before processing, check if `event_id` has already been handled (a small `processed_events` table, or a Redis set with a TTL). If yes, ack and skip. This is a required part of your LLD, not optional polish.

## 4. Docker Compose service names (keep these fixed so URLs don't break)

`discovery-service`, `workspace-service`, `escrow-service`, `rabbitmq`, `postgres-a`, `mongo-b`, `mysql-c`, `redis`, `elasticsearch`, `gateway`

## 5. Golden rule for the whole team

**Nobody calls another service directly by guessing its shape.** If you need something from another service, it's either: (a) a field already in the JWT, (b) an event in the table above, or (c) a new event/field you propose to the group *before* building — not after.
