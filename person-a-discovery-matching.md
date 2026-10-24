# Person A — Discovery & Matching Service

**One-line (share this in your group chat):** Owns user identity, project listings, advanced multi-faceted search, verified profile reviews, and skill-based matching/recommendations using GraphQL, REST, PostgreSQL, Elasticsearch, and Redis.

## Tools & concepts

| Concept | Tool |
|---|---|
| API style | GraphQL + REST (Spring Boot 3 / GraphQL) |
| Source of truth | PostgreSQL |
| Search/ranking | Elasticsearch + JPA Specifications (Multi-Faceted Filtering) |
| Cache + rate limiting | Redis |
| Sync consistency | Outbox pattern (Postgres → ES) |
| Auth | JWT issuance (RS256) + JWKS endpoint |
| Messaging | RabbitMQ producer |

---

## 1. Scope — what you own end to end

- Signup/login for students and startups (you issue the JWT everyone else trusts — see shared contract doc).
- User profile CRUD: skills, portfolio, bio, hourly rate, and aggregated rating/review count.
- Startup posts a project with required skills, budget, description.
- Students browse/search projects (skill-based ranking).
- **Advanced Search & Multi-Faceted Filtering** for both projects and student profiles (keyword, multi-skill `ANY`/`ALL` matching, budget/hourly-rate ranges, minimum rating thresholds, category/status filters, dynamic sorting, and pagination).
- **Profile Searching & Verified Review System**: startups and collaborators can submit 1–5 star reviews with titles and comments on student profiles, automatically recalculating student average ratings, review counts, and 1–5 star rating distribution histograms.
- **Recommendation Engine**: content-based and behavioral recommendations including similar projects, top student candidates for a project (with match score, matched/missing skills, and fit explanation), similar students, and recommendations based on recently viewed student profiles.
- Student applies to a project.
- Startup selects an applicant → this is the trigger point where your service publishes an event so Person B and C's services react.

## 2. Why GraphQL here, specifically (say this in the viva)

A single screen needs: the project, its required skills, the startup's profile, and the current user's match score — all at once. With REST that's 3–4 separate calls or one bloated over-fetching endpoint. GraphQL lets the client ask for exactly this shape in one round trip. This is the textbook case GraphQL was built for — don't use it "because it's modern," use it because the query shape is genuinely nested and client-driven.

## 3. API contract (GraphQL SDL & REST Endpoints)

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

type ProfileReview {
  id: ID!
  studentId: ID!
  reviewerId: ID!
  reviewerName: String!
  projectId: ID
  rating: Int!
  title: String
  comment: String
  createdAt: String!
}

type ReviewSummary {
  studentId: ID!
  averageRating: Float!
  totalReviews: Int!
  distribution: [RatingDistributionEntry!]!
}

type CandidateRecommendation {
  student: StudentProfile!
  matchScore: Float!
  matchingSkills: [String!]!
  missingSkills: [String!]!
  fitReason: String!
}

type SimilarProjectRecommendation {
  project: Project!
  similarityScore: Float!
  sharedSkills: [String!]!
}

type SimilarStudentRecommendation {
  student: StudentProfile!
  similarityScore: Float!
  sharedSkills: [String!]!
}

type Query {
  searchProjects(skills: [String!], keyword: String): [Project!]!
  advancedSearchProjects(filter: ProjectFilterInput!): ProjectPage!
  advancedSearchStudents(filter: StudentFilterInput!): StudentProfilePage!
  project(id: ID!): Project
  me: User
  studentReviews(studentId: ID!, page: Int, size: Int): [ProfileReview!]!
  studentReviewSummary(studentId: ID!): ReviewSummary!
  matchRecommendations(studentId: ID!): [ProjectRecommendation!]!
  candidateRecommendations(projectId: ID!, limit: Int): [CandidateRecommendation!]!
  similarProjects(projectId: ID!, limit: Int): [SimilarProjectRecommendation!]!
  similarStudents(studentId: ID!, limit: Int): [SimilarStudentRecommendation!]!
}

type Mutation {
  signup(email: String!, password: String!, role: Role!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  createProject(title: String!, requiredSkills: [String!]!): Project!
  applyToProject(projectId: ID!): Application!
  selectApplicant(applicationId: ID!): Project!   # <-- triggers project.matched event
  addProfileReview(studentId: ID!, input: CreateProfileReviewInput!): ProfileReview!
  deleteProfileReview(reviewId: ID!): Boolean!
}
```

### REST Endpoints for New Discovery Features
```
GET    /api/v1/projects/advanced-search                     (q, category, status, skills, allSkills, minBudget, maxBudget, sortBy, sortDirection, page, size)
GET    /api/v1/profiles/students/advanced-search            (q, skills, allSkills, minRating, maxRating, minHourlyRate, maxHourlyRate, sortBy, sortDirection, page, size)
GET    /api/v1/profiles/students/{id}/reviews               (paginated student reviews)
GET    /api/v1/profiles/students/{id}/reviews/summary       (average rating, total reviews, 1–5 star distribution)
POST   /api/v1/profiles/students/{id}/reviews               (submit or update a verified review)
DELETE /api/v1/profiles/students/reviews/{reviewId}         (delete a review and recalculate profile rating)
GET    /api/v1/recommendations/projects/{projectId}/similar
GET    /api/v1/recommendations/projects/{projectId}/candidates
GET    /api/v1/recommendations/students/{studentId}/similar
GET    /api/v1/recommendations/students/from-views          (ids=s1,s2... behavioral recommendations from viewed profiles)
```

Example call + response (for your own testing and for demoing the "why GraphQL" point):

```graphql
mutation { selectApplicant(applicationId: "abc123") { id status } }
```
```json
{ "data": { "selectApplicant": { "id": "abc123", "status": "MATCHED" } } }
```

## 4. Database schema (PostgreSQL — why relational: users, projects, applications, and reviews have real foreign-key relationships and need strict structure; a document store would just reinvent joins in application code)

- `users(id, email, password_hash, role, skills[])`
- `student_profiles(id, user_id, full_name, headline, bio, hourly_rate, rating, review_count)`
- `student_skills(student_id FK, skill)`
- `projects(id, startup_id FK, title, description, category, budget, currency, status)`
- `project_skills(project_id FK, skill)`
- `applications(id, project_id FK, student_id FK, status, match_score)`
- `profile_reviews(id, student_id FK, reviewer_id, reviewer_name, project_id, rating, title, comment, created_at, updated_at)` — with composite index on `(student_id, reviewer_id, project_id)` for duplicate-review prevention and upsert semantics.

## 5. Elasticsearch — why not just Postgres full-text search

Postgres `tsvector` can do basic keyword search but has no real relevance scoring for multi-field weighted matching (e.g. weighting exact skill match higher than a bio keyword match). Elasticsearch's BM25 ranking is built for exactly this. Sync it from Postgres using the **outbox pattern**: write to Postgres and an `outbox` table in the same transaction, then a background worker reads the outbox and pushes to ES. This avoids the classic dual-write bug where a Postgres write succeeds but the ES write silently fails, leaving search out of sync.

ES document shape (index: `projects`):
```json
{ "id": "p1", "title": "...", "skills": ["react", "node"], "startupName": "...", "status": "open" }
```

## 6. Newly Implemented Features (Final Review Progress)

### 6.1 Advanced Search & Multi-Faceted Filtering
- Dynamic JPA `Specification` builders (`ProjectSpecifications` & `StudentProfileSpecifications`) supporting:
  - Full-text keyword matching across title, description, category, full name, headline, and bio.
  - Multi-skill filtering with toggleable **`ANY` (OR)** vs **`ALL` (AND)** skill-matching modes.
  - Budget range (`minBudget`, `maxBudget`) for projects and hourly rate range (`minHourlyRate`, `maxHourlyRate`) + minimum star rating (`minRating`) for student talent.
  - Multi-column sorting (`createdAt`, `budget`, `title`, `rating`, `reviewCount`, `hourlyRate`, `fullName`) and server-side pagination (`PageResponse<T>`).

### 6.2 Student Profile Searching & Review System
- End-to-end review lifecycle via `ProfileReviewService`:
  - Startups can rate students from 1 to 5 stars with a title, detailed feedback comment, and optional associated `projectId`.
  - Submitting or deleting a review transactionally recalculates `StudentProfile.rating` (rounded to 2 decimal places) and `StudentProfile.reviewCount`, and re-indexes the updated student document in Elasticsearch.
  - Summary endpoint provides a full 5-star to 1-star distribution breakdown for visual rating bars in the UI.

### 6.3 Recommendation Engine
- Hybrid content-based and behavioral recommendation engine (`RecommendationService`):
  - **Similar Projects**: combines Jaccard skill similarity ($75\%$ weight), category match ($15\%$), and budget proximity ($10\%$).
  - **Top Candidates for a Project**: ranks students using skill coverage ($75\%$), normalized review rating ($20\%$), and review volume confidence bonus ($5\%$), returning matched skills, missing skills, and a human-readable fit explanation.
  - **Similar Students & Behavioral "From Recently Viewed" Recommendations**: aggregates a skill frequency vector from recently viewed student profiles (`localStorage` view history) and recommends complementary unviewed candidates.

## 7. Redis usage (two distinct jobs — name them separately in your presentation)

- **Cache-aside for search:** key `search:<hash-of-filters>`, TTL 60s, avoids re-hitting ES for repeated identical queries.
- **Rate limiting:** token-bucket on the search endpoint, key `rl:search:<userId>`, prevents scraping/abuse.

## 8. Auth you issue (see shared-contracts.md for full detail)

On `login`/`signup`, sign a JWT with your private RS256 key. Expose `GET /.well-known/jwks.json` with your public key so Services B and C can verify tokens without ever holding your signing key.

## 9. Events

- **Publish** `project.matched` when `selectApplicant` succeeds: `{ projectId, studentId, startupId }`.
- **Consume** `payment.released` (optional): update a "completed projects" flag on the student's portfolio for social proof.

## 10. CAP stance: **AP**

If Elasticsearch is a few seconds behind Postgres, a stale search result is a minor annoyance, not a real problem. What must never happen is search going down entirely. So you deliberately favor availability over strict real-time consistency between Postgres and ES — say this explicitly, and contrast it with Person C's CP choice.

## 11. Non-functional notes

- Stateless service → trivially horizontally scalable behind the gateway (no sticky sessions needed, unlike Person B's).
- Deploy as a single Docker container; Postgres + ES + Redis as separate containers in the same compose file.

## Deliverables checklist

- [x] GraphQL schema + resolvers
- [x] Postgres migrations (`V1`–`V3`, including `profile_reviews` and `review_count`)
- [x] Advanced Search & Multi-Faceted Filtering (`ProjectSpecifications`, `StudentProfileSpecifications`)
- [x] Student Profile Review & Rating System (`ProfileReviewService`, star distribution summary)
- [x] Recommendation Engine (Similar Projects, Top Candidates, Similar Students, Recently Viewed)
- [x] Outbox worker → Elasticsearch sync
- [x] Redis cache-aside + rate limiter
- [x] JWT issuance + JWKS endpoint
- [x] RabbitMQ producer for `project.matched`
- [x] Dockerfile + compose entry
