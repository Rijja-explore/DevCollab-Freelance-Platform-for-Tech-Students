# Person D — Skill Gap Analysis + Course Recommendation (inside Discovery Service)

**One-line (share this in your group chat):** Adds an intelligent skill-gap layer on top of Person A's Discovery & Matching Service — compares a student's skills against project requirements (and failed match signals), quantifies the gap, and recommends short learning modules to close it — all via GraphQL, using existing PostgreSQL data, no new microservice, no new database.

---

## Tools & concepts

| Concept | Tool |
|---|---|
| Host service | Person A's Discovery Service (Spring Boot 3.2.5, Java 21) |
| API extension | GraphQL (Spring for GraphQL — same endpoint `/graphql`) |
| Source of truth | Person A's PostgreSQL (`student_skills`, `project_skills`, `matches`) |
| Search (existing) | Elasticsearch — **not used** for this feature V1 (exact set-diff needs no BM25) |
| Cache (existing) | Redis — **optional** `@Cacheable("skillgaps")` 10 min V1, not required |
| Auth | Reuse Person A's RS256 JWT (`sub` = studentId, role=STUDENT) |
| Messaging | **No new events** — reads `project.matched` context, does not publish |
| Algorithm | Deterministic set operations + rule-based ranking (explainable in viva) |
| Data | Mock course catalog (static in-memory) V1; DB table only if approved later |

---

## 1. Scope — what you own end to end

- **Skill Gap Analysis**: Given a student + project, compute matched skills, missing skills, coverage %, severity tier, and human-readable explanations ("Missing Docker because project 'AI Logistics API' requires Docker").
- **Failed-Match Integration**: When an application is rejected (`matches.status = 'REJECTED'` or `match_score < 50`), derive the same gap on demand — no duplicate storage V1.
- **Course Recommendation Layer**: For each missing skill, rank short learning modules (duration, price, difficulty, free-first) from a static catalog. No LMS, no video hosting, no enrollment, no payment.
- **GraphQL API**: Add two queries to Person A's existing schema (`skillGap`, `analyzeMySkillGap`) with minimal, typed response shapes.
- **Independence**: Runs entirely on mock data in V1 — zero dependency on Person B (Mongo) or Person C (MySQL/PayPal). Plug into real JPA repos in Phase 2.

---

## 2. Why this lives INSIDE Service A (say this in the viva)

Skill gap analysis is **semantically coupled** to the matching logic Person A already owns:
- It reuses `student_skills` and `project_skills` join tables.
- It reuses the **exact same normalization** (`toLowerCase()` + alias map) that `MatchingService.getRecommendations()` uses.
- It reads `MatchRecord` (the application/match attempt) to power Scenario B (failed matches).
- It would be wasteful and architecturally wrong to build a fourth service that just queries Service A's tables over the network — that adds latency, duplication, and a new failure domain. Keeping it in-process is the correct bounded-context decision: "skill evaluation" belongs with "skill matching."

---

## 3. API contract (GraphQL SDL — additions to Person A's `schema.graphqls`)

```graphql
type SkillGapAnalysis {
  studentId: ID!
  projectId: ID!
  projectTitle: String!
  studentSkills: [String!]!
  requiredSkills: [String!]!
  matchedSkills: [String!]!
  missingSkills: [String!]!
  coverage: Float!
  severity: String!
  explanations: [String!]!
  recommendations: [CourseRecommendation!]!
}

type CourseRecommendation {
  courseId: ID!
  title: String!
  skill: String!
  provider: String!
  durationHours: Float!
  price: Float!
  currency: String!
  difficulty: String!
  url: String!
  reason: String!
  score: Float!
}

extend type Query {
  # Explicit studentId (admin/demo use; requires STUDENT role for target)
  skillGap(studentId: ID!, projectId: ID!): SkillGapAnalysis!

  # Auth-derived — preferred for production (reads JWT `sub`)
  analyzeMySkillGap(projectId: ID!): SkillGapAnalysis!
}
```

**Example call (GraphiQL at `http://localhost:8081/graphiql`):**

```graphql
query {
  analyzeMySkillGap(projectId: "project-001") {
    projectTitle
    matchedSkills
    missingSkills
    coverage
    severity
    explanations
    recommendations {
      title
      skill
      durationHours
      price
      currency
      difficulty
      reason
      score
    }
  }
}
```

**Example response:**

```json
{
  "data": {
    "analyzeMySkillGap": {
      "projectTitle": "AI Logistics API",
      "matchedSkills": ["Python", "MongoDB"],
      "missingSkills": ["FastAPI", "Docker"],
      "coverage": 0.5,
      "severity": "MEDIUM",
      "explanations": [
        "Missing FastAPI because project 'AI Logistics API' requires FastAPI.",
        "Missing Docker because project 'AI Logistics API' requires Docker."
      ],
      "recommendations": [
        {
          "title": "FastAPI Fundamentals",
          "skill": "FastAPI",
          "durationHours": 3,
          "price": 0,
          "currency": "USD",
          "difficulty": "Beginner",
          "reason": "Directly covers missing skill FastAPI; free, beginner, short duration.",
          "score": 125
        },
        {
          "title": "FastAPI Production Patterns",
          "skill": "FastAPI",
          "durationHours": 6,
          "price": 19,
          "currency": "USD",
          "difficulty": "Intermediate",
          "reason": "Directly covers missing skill FastAPI; intermediate depth for production readiness.",
          "score": 97
        },
        {
          "title": "Docker Basics",
          "skill": "Docker",
          "durationHours": 4,
          "price": 0,
          "currency": "USD",
          "difficulty": "Beginner",
          "reason": "Directly covers missing skill Docker; free, beginner, ≤4h.",
          "score": 125
        },
        {
          "title": "Docker Deep Dive",
          "skill": "Docker",
          "durationHours": 8,
          "price": 29,
          "currency": "USD",
          "difficulty": "Intermediate",
          "reason": "Directly covers missing skill Docker; intermediate depth.",
          "score": 89
        }
      ]
    }
  }
}
```

---

## 4. Database — **no new tables in V1** (preferred)

Derive everything from Person A's existing schema (`V1__init_discovery_and_auth.sql`):

- `student_skills(student_id, skill)` — student's current skills.
- `project_skills(project_id, skill)` — project's required skills.
- `matches(id, project_id, startup_id, student_id, match_score, status, matched_at)` — applications/match attempts. Status is free `VARCHAR`; today `PENDING` (SQL default), `ACCEPTED` (code writes), no `REJECTED` yet.

**Skills are stored as plain strings** (no skill table, no IDs, no proficiency levels). Case preserved in DB; normalization happens only at comparison time (see §6).

**If a course table is approved later** (Phase 2+):
```sql
CREATE TABLE courses (
  id VARCHAR(36) PRIMARY KEY,
  skill VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(100),
  duration_hours DECIMAL(5,2),
  price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  difficulty VARCHAR(20),
  url TEXT,
  tags VARCHAR(500),
  INDEX idx_courses_skill (skill)
);
```
Do not create this unless explicitly asked.

---

## 5. Algorithm (deterministic, explainable, compatible with `MatchingService`)

**Implementation location:** `discovery-service/src/main/java/com/devcollab/discovery/skillgap/`

### 5.1 Skill normalization (REUSE, don't duplicate)

```java
private static final Map<String, String> ALIASES = Map.of(
  "nodejs", "node.js",
  "reactjs", "react",
  "postgres", "postgresql",
  "k8s", "kubernetes",
  "gh-actions", "github actions"
);

static String norm(String s) {
  String n = s.trim().toLowerCase(Locale.ROOT);
  return ALIASES.getOrDefault(n, n);
}
```

### 5.2 Gap computation

```
reqNorm = project.requiredSkills.stream().map(norm).collect(toSet())
stuNorm = student.skills.stream().map(norm).collect(toSet())

matchedNorm = intersection(reqNorm, stuNorm)
missingNorm = reqNorm - stuNorm

coverage = reqNorm.isEmpty() ? 1.0 : (double) matchedNorm.size() / reqNorm.size()

severity =
  coverage == 1.0      ? "NONE" :
  coverage >= 0.75     ? "LOW" :
  coverage >= 0.50     ? "MEDIUM" :
  coverage > 0         ? "HIGH" : "CRITICAL"

explanations = missingNorm.map(m ->
  "Missing " + originalCase(m) + " because project '" + projectTitle + "' requires " + originalCase(m) + ".")
```

Return `matchedSkills` / `missingSkills` in **original display casing** from `project.requiredSkills` (not lowercased).

### 5.3 Course ranking (simple, defensible)

For each `missingSkill`:
1. Filter `CourseCatalog` by `course.skill.equalsIgnoreCase(missingSkill)`.
2. Score each course:
   ```
   score = 100                    // skill exact match (always true here)
         + (course.price == 0 ? 15 : 0)        // free bonus
         + (difficultyFit(course.difficulty) ? 10 : 0)  // Beginner/Intermediate fit
         + (course.durationHours <= 4 ? 10 : 0)         // short bonus
         - 2 * course.durationHours                   // duration penalty
   ```
   `difficultyFit = difficulty ∈ {Beginner, Intermediate}`.
3. Sort desc by `score`, then `price asc`, then `durationHours asc`.
4. Take **top 2 per skill**, **max 5 total** across all missing skills.
5. Attach `reason` string summarizing why:  
   `"Directly covers missing skill {skill}; free, beginner, ≤4h."`

---

## 6. Data flow (exact)

```
Student (JWT sub) + Project
       ↓
StudentProfileRepository.findByUserId(studentId) → Set<String> studentSkills
ProjectRepository.findById(projectId)           → Set<String> requiredSkills
       ↓
norm() + intersection/difference (SkillGapService)
       ↓
coverage + severity + explanations
       ↓
CourseRecommendationService.recommend(missingSkills) → ranked List<CourseRecommendation>
       ↓
SkillGapAnalysis response
```

**Failed-match path (Scenario B):**
```
MatchRecord (status=REJECTED or match_score<50)
       ↓
studentId + projectId from match row
       ↓
SAME gap computation as above (on-demand, no storage)
       ↓
recommendations attached to match history in UI
```

---

## 7. Mock data (copy into `CourseCatalog.java` + tests — consistent IDs)

```json
{
  "students": [
    {"id":"student-001","userId":"user-001","role":"STUDENT","fullName":"Aarav Sharma",
     "skills":["Python","MongoDB","React"],"rating":4.7},
    {"id":"student-002","userId":"user-002","role":"STUDENT","fullName":"Mira Khan",
     "skills":["React","TypeScript","Node.js","Java","PostgreSQL"],"rating":4.9},
    {"id":"student-003","userId":"user-003","role":"STUDENT","fullName":"Leo Park",
     "skills":["HTML","CSS"],"rating":4.2}
  ],
  "projects": [
    {"id":"project-001","startupId":"startup-001","title":"AI Logistics API",
     "requiredSkills":["Python","FastAPI","MongoDB","Docker"],"status":"OPEN"},
    {"id":"project-002","startupId":"startup-001","title":"React Dashboard",
     "requiredSkills":["React","TypeScript","Node.js"],"status":"OPEN"},
    {"id":"project-003","startupId":"startup-002","title":"DevOps Pipeline",
     "requiredSkills":["Docker","Kubernetes","GitHub Actions","AWS"],"status":"OPEN"}
  ],
  "matches": [
    {"id":"match-001","studentId":"student-001","projectId":"project-001",
     "status":"REJECTED","matchScore":50.0,"missingSkills":["FastAPI","Docker"]},
    {"id":"match-002","studentId":"student-002","projectId":"project-002",
     "status":"ACCEPTED","matchScore":100.0,"missingSkills":[]}
  ],
  "courses": [
    {"id":"course-001","skill":"FastAPI","title":"FastAPI Fundamentals",
     "provider":"FreeCodeCamp","durationHours":3,"price":0,"currency":"USD",
     "difficulty":"Beginner","url":"https://mock.local/c/fastapi-fundamentals"},
    {"id":"course-002","skill":"FastAPI","title":"FastAPI Production Patterns",
     "provider":"Udemy Mock","durationHours":6,"price":19,"currency":"USD",
     "difficulty":"Intermediate","url":"https://mock.local/c/fastapi-prod"},
    {"id":"course-003","skill":"Docker","title":"Docker Basics",
     "provider":"Docker Mock Labs","durationHours":4,"price":0,"currency":"USD",
     "difficulty":"Beginner","url":"https://mock.local/c/docker-basics"},
    {"id":"course-004","skill":"Docker","title":"Docker Deep Dive",
     "provider":"Pluralsight Mock","durationHours":8,"price":29,"currency":"USD",
     "difficulty":"Intermediate","url":"https://mock.local/c/docker-deep"},
    {"id":"course-005","skill":"Kubernetes","title":"K8s Starter",
     "provider":"CNCF Mock","durationHours":5,"price":0,"currency":"USD",
     "difficulty":"Beginner","url":"https://mock.local/c/k8s-starter"}
  ]
}
```

Covers: perfect match (002/002), 1–2 gaps (001/001), many gaps (003/003), failed app (match-001), multi-course ranking (FastAPI×2, Docker×2).

---

## 8. Authentication (reuse Person A's system — do not create another)

- **Student identification**: `studentId` = JWT `sub` claim. Use `JwtTokenService.verifyToken(token).getSubject()`.
- **Role check**: Only `role=STUDENT` may call `analyzeMySkillGap`. `STARTUP`/`ADMIN` → 403.
- **Explicit `skillGap(studentId, projectId)`**: Allow for admin/demo but still require valid JWT; log audit if `studentId != sub`.
- **Endpoints to reuse**: `AuthController#getMe` pattern (`Authorization: Bearer`), `/.well-known/jwks.json` for B/C.
- **No new keys, no new token logic, no new filter** — `SecurityConfig` already `permitAll` on `/graphql/**`.

---

## 9. Elasticsearch / Redis — **not used V1** (by design)

- **Elasticsearch**: Gap analysis is exact set-difference; BM25 adds nothing. Future: fuzzy skill search in catalog → ES.
- **Redis**: Existing `recommendations` cache (`@Cacheable("recommendations", key=studentId)`) stays. Optional `@Cacheable("skillgaps", key=studentId+":"+projectId)` TTL 10 min later — **must evict on profile update**. Not required V1.

---

## 10. Failed-match integration (least invasive)

- **No `REJECTED` status exists today** — `matches.status` is free `VARCHAR`. Treat `status='REJECTED'` OR `match_score < 50` as failed signal.
- **Derive on demand** — do not add `missing_skills` column to `matches` in V1.
- **Two entry points**:
  - `skillGap(studentId, projectId)` — always works, regardless of match history.
  - Future: `GET /api/matches/student/{id}/gaps` attaches analysis to each failed match.
- **Never change `project.matched` event** (Person B/C depend on its shape).

---

## 11. Files — exact paths (create/modify only these)

### CREATE
```
discovery-service/src/main/java/com/devcollab/discovery/skillgap/
  ├─ SkillGapService.java              // norm + diff + coverage + severity
  ├─ CourseCatalog.java                // static List<Course> from mock JSON
  ├─ CourseRecommendationService.java  // ranking formula §5.3
  ├─ SkillGapTypes.java                // DTOs (or inner classes)
discovery-service/src/test/java/com/devcollab/discovery/skillgap/
  ├─ SkillGapServiceTest.java
  └─ CourseRecommendationServiceTest.java
```

### MODIFY (minimal)
```
discovery-service/src/main/resources/graphql/schema.graphqls     // append §3 types + queries
discovery-service/src/main/java/com/devcollab/discovery/controller/ProjectGraphQLController.java
  // add @QueryMapping skillGap + analyzeMySkillGap
```

### DO NOT MODIFY
- `auth/JwtTokenService.java`, `config/SecurityConfig.java` (unless new path needs allow-list — prefer none)
- `service/MatchingService.java` (scoring logic — reuse only)
- `service/ProjectMatchedEventPublisher.java`, `config/RabbitMQConfig.java`
- `entity/*`, `repository/*`, `document/*`
- Person B's MongoDB, Person C's MySQL/PayPal logic
- `docker-compose.yml` contracts, root `.env` keys
- Root `README.md`, `00-shared-contracts.md`

---

## 12. Tests (12 cases — input → expected → why)

| # | Scenario | Input | Expected | Why |
|---|----------|-------|----------|-----|
| 1 | Perfect match | student-002 + project-002 | coverage=1.0, severity=NONE, recommendations=[] | All skills present |
| 2 | Zero overlap | student-003 + project-001 | coverage=0.0, severity=CRITICAL, all 4 missing | No shared skills |
| 3 | Partial (1–2 gaps) | student-001 + project-001 | coverage=0.5, severity=MEDIUM, missing=[FastAPI,Docker] | Core demo case |
| 4 | Normalization | student=["ReactJS","DOCKER"] vs project=["React","Docker"] | matched=[React,Docker], missing=[] | Alias map works |
| 5 | Unknown skill | project requires "COBOL" | missing=[COBOL], recommendations=[] for it | Graceful empty recs |
| 6 | Failed match | match-001 (REJECTED, score=50) | Same gap as live calc | Scenario B path |
| 7 | No course for skill | missing skill with 0 catalog entries | recommendations=[] for that skill, others ranked | Robustness |
| 8 | Multi-course same skill | FastAPI 2 courses | course-001 (free,3h) ranked > course-002 (paid,6h) | Ranking formula |
| 9 | Free vs paid | Docker 2 courses | course-003 (free) > course-004 (paid) | Cost tie-breaker |
| 10 | Invalid projectId | "bad-id" | `IllegalArgumentException("Project not found: bad-id")` | Error handling |
| 11 | Unauthorized | No/invalid JWT on `analyzeMySkillGap` | 401 | Auth required |
| 12 | Wrong role | STARTUP calls `analyzeMySkillGap` | 403 | Role enforcement |

**Unit tests**: Mockito repos (like `MatchingServiceTest`).  
**Integration test**: `@SpringBootTest` GraphQL query (like `ProjectServiceTest`).  
**Run**: `cd discovery-service && mvn clean test` — must stay green.

---

## 13. Demo flow (mock only — no Person B/C needed)

1. `POST /api/auth/login` as `student-001` → get JWT.
2. Open `http://localhost:8081/graphiql`, set `Authorization: Bearer <token>`.
3. Query `project(id:"project-001")` → show requiredSkills.
4. Query `studentProfile(id:"student-001")` → show skills.
5. Run `analyzeMySkillGap(projectId:"project-001")` → observe matched/missing/coverage/severity.
6. Inspect `recommendations` — note free-first, short-first, reason strings.
7. Show `GET /api/matches/student/student-001` → find `match-001` (REJECTED, score=50).
8. Run `skillGap(studentId:"student-001", projectId:"project-001")` → same insight from failed match.
9. Contrast with `student-002` + `project-002` → perfect match, empty recommendations.

---

## 14. Phased delivery (do not wait for later phases)

| Phase | Goal | Dependency |
|---|---|---|
| **P1** | Standalone mock: `SkillGapService` + `CourseCatalog` + GraphQL queries work with in-memory fixtures | None — start today |
| **P2** | Wire JPA repos (`ProjectRepository`, `StudentProfileRepository`, `MatchRecordRepository`) | Person A's DB running (`docker compose up postgres-discovery`) |
| **P3** | Hook failed-match: `REJECTED` status + low-score derivation + UI attachment | Person A adds `REJECTED` to match flow (coordinate) |
| **P4 (optional)** | ES fuzzy catalog search, Redis `@Cacheable("skillgaps")`, external course APIs, completion → re-match lift | Explicit approval |

---

## 15. What you MUST NOT DO

- ❌ Create a fourth microservice.
- ❌ Create a new database/table unless explicitly approved (V1 uses static catalog).
- ❌ Rewrite Person A's `MatchingService` scoring or `ProjectMatchedEventPublisher`.
- ❌ Replace GraphQL with REST.
- ❌ Create another JWT/auth system (reuse A's).
- ❌ Modify Person B's MongoDB or Person C's MySQL/PayPal logic.
- ❌ Change RabbitMQ event contracts (`project.matched`, `payment.released`, etc.) — they are cross-team contracts.
- ❌ Break existing A/B/C integration (run `mvn clean test` in all three services before PR).
- ❌ Add ML/LLM/embeddings/vector DB — deterministic V1 is a feature, not a limitation.
- ❌ Depend on Person B or C to start development (mock data is your contract).
- ❌ Wait for final integration to begin — P1 is fully demonstrable in isolation.

---

## 16. Acceptance criteria (you are done when)

- [ ] `skillGap(studentId, projectId)` returns correct matched/missing/coverage/severity/explanations.
- [ ] `analyzeMySkillGap(projectId)` derives studentId from JWT `sub`, enforces STUDENT role.
- [ ] Missing skills identified from both live project view AND failed/rejected match (`REJECTED` or `score<50`).
- [ ] Courses recommended per missing skill, ranked by formula (§5.3), max 2/skill, 5 total.
- [ ] Mock data works without any database (unit tests pass with Mockito).
- [ ] GraphQL queries work in GraphiQL (`/graphiql`) and via `curl /graphql`.
- [ ] Existing authentication (JWT RS256, JWKS) respected — no new keys.
- [ ] `cd discovery-service && mvn clean test` — **all existing + new tests pass**.
- [ ] `docker compose up -d --build` — service starts, health `/actuator/health` UP.
- [ ] Full demo (§13) runs without Person B or C containers.
- [ ] Person A's `project.matched` event unchanged; Person B/C integration unbroken.

---

## 17. Environment / secrets you need — ask the owners

| Need | Ask | Purpose |
|---|---|---|
| Postgres / ES / Redis / RabbitMQ creds | **Person A** | Run Discovery Service locally (`DB_HOST`, `ELASTICSEARCH_URIS`, `REDIS_HOST`, `RABBITMQ_*`) |
| JWT private/public key rotation | **Person A** | `src/main/resources/keys/private.pem|public.pem` (never commit real prod key) |
| Root `.env` defaults | **Person A** | `POSTGRES_DB/USER/PASSWORD`, `ELASTICSEARCH_URL`, `REDIS_HOST/PORT`, `RABBITMQ_USER/PASSWORD`, `VITE_DEV_AUTH` |
| Workspace CORS / Mongo URI | **Person B** | Only if demo links to workspace chat (not required P1) |
| PayPal Sandbox Client ID/Secret | **Person C** | Only if demoing post-match payment release (not required P1) |

**Local run (defaults work):**
```bash
cp .env.example .env
docker compose up -d --build   # starts postgres-discovery, elasticsearch, redis, rabbitmq, discovery-service:8081
# GraphQL: http://localhost:8081/graphiql
# Health:  http://localhost:8081/actuator/health
```

---

## 18. Deliverables checklist

- [ ] `SkillGapService` — normalization, intersection, coverage, severity, explanations
- [ ] `CourseCatalog` — static mock data (JSON→Java)
- [ ] `CourseRecommendationService` — ranking formula + reason strings
- [ ] GraphQL schema additions (`SkillGapAnalysis`, `CourseRecommendation`, 2 queries)
- [ ] `ProjectGraphQLController` resolvers (auth-derived + explicit)
- [ ] Unit tests (12 cases minimum, Mockito)
- [ ] GraphQL integration test (`@SpringBootTest`)
- [ ] All existing Discovery tests still pass
- [ ] Docker dev environment works
- [ ] End-to-end demo script documented (this file §13)