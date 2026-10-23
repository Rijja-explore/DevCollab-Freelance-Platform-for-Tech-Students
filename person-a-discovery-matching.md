# Person A — Discovery & Matching Service

**One-line (share this in your group chat):** Owns user identity, project listings, and skill-based search/matching using GraphQL, PostgreSQL, Elasticsearch, and Redis.

## Tools & concepts

| Concept | Tool |
|---|---|
| API style | GraphQL (Apollo Server, Node.js) |
| Source of truth | PostgreSQL |
| Search/ranking | Elasticsearch |
| Cache + rate limiting | Redis |
| Sync consistency | Outbox pattern (Postgres → ES) |
| Auth | JWT issuance (RS256) + JWKS endpoint |
| Messaging | RabbitMQ producer |

---

## 1. Scope — what you own end to end

- Signup/login for students and startups (you issue the JWT everyone else trusts — see shared contract doc).
- User profile CRUD: skills, portfolio, bio.
- Startup posts a project with required skills, budget, description.
- Students browse/search projects (skill-based ranking).
- Student applies to a project.
- Startup selects an applicant → this is the trigger point where your service publishes an event so Person B and C's services react.

## 2. Why GraphQL here, specifically (say this in the viva)

A single screen needs: the project, its required skills, the startup's profile, and the current user's match score — all at once. With REST that's 3–4 separate calls or one bloated over-fetching endpoint. GraphQL lets the client ask for exactly this shape in one round trip. This is the textbook case GraphQL was built for — don't use it "because it's modern," use it because the query shape is genuinely nested and client-driven.

## 3. API contract (GraphQL SDL — this is what B and C's frontend/teammates can expect if they ever query you)

```graphql
type User {
  id: ID!
  role: Role!
  skills: [String!]!
  portfolio: [PortfolioItem!]!
}

type Project {
  id: ID!
  title: String!
  requiredSkills: [String!]!
  startup: User!
  status: ProjectStatus!
}

type Application {
  id: ID!
  project: Project!
  student: User!
  matchScore: Float!
}

type Query {
  searchProjects(skills: [String!], keyword: String): [Project!]!
  project(id: ID!): Project
  me: User
}

type Mutation {
  signup(email: String!, password: String!, role: Role!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  createProject(title: String!, requiredSkills: [String!]!): Project!
  applyToProject(projectId: ID!): Application!
  selectApplicant(applicationId: ID!): Project!   # <-- triggers project.matched event
}
```

Example call + response (for your own testing and for demoing the "why GraphQL" point):

```graphql
mutation { selectApplicant(applicationId: "abc123") { id status } }
```
```json
{ "data": { "selectApplicant": { "id": "abc123", "status": "MATCHED" } } }
```

## 4. Database schema (PostgreSQL — why relational: users, projects, and applications have real foreign-key relationships and need strict structure; a document store would just reinvent joins in application code)

- `users(id, email, password_hash, role, skills[])`
- `projects(id, startup_id FK, title, description, status)`
- `project_skills(project_id FK, skill)`
- `applications(id, project_id FK, student_id FK, status, match_score)`

## 5. Elasticsearch — why not just Postgres full-text search

Postgres `tsvector` can do basic keyword search but has no real relevance scoring for multi-field weighted matching (e.g. weighting exact skill match higher than a bio keyword match). Elasticsearch's BM25 ranking is built for exactly this. Sync it from Postgres using the **outbox pattern**: write to Postgres and an `outbox` table in the same transaction, then a background worker reads the outbox and pushes to ES. This avoids the classic dual-write bug where a Postgres write succeeds but the ES write silently fails, leaving search out of sync.

ES document shape (index: `projects`):
```json
{ "id": "p1", "title": "...", "skills": ["react", "node"], "startupName": "...", "status": "open" }
```

## 6. Redis usage (two distinct jobs — name them separately in your presentation)

- **Cache-aside for search:** key `search:<hash-of-filters>`, TTL 60s, avoids re-hitting ES for repeated identical queries.
- **Rate limiting:** token-bucket on the search endpoint, key `rl:search:<userId>`, prevents scraping/abuse.

## 7. Auth you issue (see shared-contracts.md for full detail)

On `login`/`signup`, sign a JWT with your private RS256 key. Expose `GET /.well-known/jwks.json` with your public key so Services B and C can verify tokens without ever holding your signing key.

## 8. Events

- **Publish** `project.matched` when `selectApplicant` succeeds: `{ projectId, studentId, startupId }`.
- **Consume** `payment.released` (optional): update a "completed projects" flag on the student's portfolio for social proof.

## 9. CAP stance: **AP**

If Elasticsearch is a few seconds behind Postgres, a stale search result is a minor annoyance, not a real problem. What must never happen is search going down entirely. So you deliberately favor availability over strict real-time consistency between Postgres and ES — say this explicitly, and contrast it with Person C's CP choice.

## 10. Non-functional notes

- Stateless service → trivially horizontally scalable behind the gateway (no sticky sessions needed, unlike Person B's).
- Deploy as a single Docker container; Postgres + ES + Redis as separate containers in the same compose file.

## Deliverables checklist

- [ ] GraphQL schema + resolvers
- [ ] Postgres migrations
- [ ] Outbox worker → Elasticsearch sync
- [ ] Redis cache-aside + rate limiter
- [ ] JWT issuance + JWKS endpoint
- [ ] RabbitMQ producer for `project.matched`
- [ ] Dockerfile + compose entry
