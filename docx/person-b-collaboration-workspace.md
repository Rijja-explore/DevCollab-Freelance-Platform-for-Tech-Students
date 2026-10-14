# Person B — Real-Time Collaboration Workspace

**One-line (share this in your group chat):** Runs live chat, code comments, and presence per project workspace using Socket.io, MongoDB, and Redis pub/sub for scaling.

## Tools & concepts

| Concept | Tool |
|---|---|
| Real-time transport | Socket.io (Node.js) |
| Data store | MongoDB |
| Cross-instance broadcast | Redis pub/sub (Socket.io adapter) |
| Presence | Redis keys with TTL |
| Packaging | Docker |
| Messaging | RabbitMQ consumer + producer |

---

## 1. Scope — what you own end to end

- Automatically create a workspace when you receive `project.matched` from Service A (not via a public REST call — this is event-driven, triggered by the match, not by a user clicking something on your service).
- Real-time chat within a workspace room.
- Threaded code comments (attached to a file/line reference).
- Presence ("who's online right now in this workspace").
- Typing indicators.
- Milestone marking — when a student/startup marks a milestone done in your UI, you publish an event so Person C's service can release payment.

## 2. Why Socket.io specifically (say this in the viva)

Plain HTTP request/response can't give live typing indicators or instant message delivery without expensive polling. Socket.io gives a persistent, bidirectional connection, plus built-in reconnection and transport fallback (falls back to long-polling if WebSocket is blocked by a firewall) — which raw WebSocket doesn't give you for free. This is your concrete example of **push vs polling** from the syllabus.

## 3. API contract

**REST (history/pagination only — workspace creation itself is event-driven, not a public endpoint):**

```
GET /api/workspace/:workspaceId/messages?cursor=<messageId>&limit=50
```
Response:
```json
{
  "messages": [{ "id": "...", "authorId": "...", "text": "...", "createdAt": "..." }],
  "nextCursor": "m_1029"
}
```

Use **cursor-based pagination**, not offset-based — say why: under a fast-arriving chat stream, offset pagination skips or duplicates messages as new ones are inserted mid-scroll; a cursor pinned to the last-seen message ID is stable regardless of what's inserted after it.

**Socket.io events (namespace per workspace: `/workspace/:id`):**

| Event | Direction | Payload |
|---|---|---|
| `message:send` | client → server | `{ tempId, text }` |
| `message:received` | server → all clients in room | `{ id, authorId, text, createdAt }` |
| `comment:add` | client → server | `{ fileRef, lineNumber, text, parentId? }` |
| `presence:update` | server → room | `{ userId, status: "online"\|"offline" }` |
| `typing` | client → server → room | `{ userId }` |

Connection handshake: `{ auth: { token: "<JWT from Service A>" } }` — verified using A's public JWKS key (see shared-contracts.md).

## 4. Database schema (MongoDB — why not Postgres)

Comments are naturally a **thread**: a comment can have replies, code-diff metadata, and reactions — a variable, nested shape. Forcing that into rigid relational tables means either a deeply joined schema or a lot of NULL columns. A document per thread with nested replies matches the actual data shape.

- `workspaces { _id, projectId, createdAt }`
- `messages { _id, workspaceId, authorId, text, createdAt }`
- `comments { _id, workspaceId, fileRef, lineNumber, parentId, text, replies: [...] }`

## 5. Redis — two distinct jobs (name them separately)

- **Socket.io Redis adapter (pub/sub):** the moment you run more than one instance of this service (for scaling), a message from a client connected to instance-1 needs to reach a client connected to instance-2. Redis pub/sub is the standard broadcast layer that makes this work — without it, multi-instance chat silently breaks (users on different instances can't see each other's messages). This is one of the best LLD talking points in the whole project.
- **Presence:** key `presence:<workspaceId>:<userId>`, TTL 30s, refreshed by a client heartbeat every ~15s. Cheap way to track "online now" without hammering MongoDB.

## 6. Scaling nuance vs Person A (say this explicitly in your presentation)

Person A's service is **stateless** — any instance can handle any request, trivial load balancing. Your service is **stateful** — a client's WebSocket connection lives on one specific instance. That's exactly why you need either sticky sessions at the load balancer or the Redis adapter above (Redis adapter is the better answer — it removes the sticky-session requirement entirely).

## 7. Events

- **Consume** `project.matched` → create the workspace document.
- **Consume** `payment.released` → post a system message into the chat ("Milestone 2 payment released").
- **Publish** `milestone.completed` when a milestone is marked done in your UI: `{ projectId, milestoneId, amount, submittedBy }`.

## 8. CAP stance: **AP**

Like any chat app (Slack, Discord) — a message arriving half a second late somewhere is a non-issue. A dropped connection is not. You choose availability over strict ordering/consistency guarantees.

## Deliverables checklist

- [ ] Socket.io server + namespace-per-workspace setup
- [ ] MongoDB schemas for workspaces/messages/comments
- [ ] Redis adapter wired in (even if you only run 1 instance for demo, show you designed for N)
- [ ] Presence via Redis TTL keys
- [ ] Cursor-based history pagination REST endpoint
- [ ] RabbitMQ consumer for `project.matched`, `payment.released`
- [ ] RabbitMQ producer for `milestone.completed`
- [ ] Dockerfile + compose entry
