# DevCollab — Freelance Platform for Tech Students

> **Microservices Freelancing & Collaboration Ecosystem**  
> Architecture compliant with the DevCollab System Specification: independent deployments, database-per-service isolation, event-driven orchestration, RS256 JWT security, real-time WebSockets, and integrated PayPal Sandbox Escrow.

---

## 🏛️ System Architecture

```
                               ┌───────────────────────────┐
                               │     DevCollab Frontend    │
                               │  (React + Vite + Tailwind)│
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │ REST / GraphQL              │ REST / WebSocket            │ REST / Webhooks
               ▼                             ▼                             ▼
  ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
  │   Discovery & Match     │   │   Collaboration Work    │   │     Payment Escrow      │
  │    (Spring Boot 3)      │   │    (Node.js/Express)    │   │    (Spring Boot 3)      │
  │        Port 8081        │   │        Port 5000        │   │        Port 8080        │
  └──────┬───────────┬──────┘   └──────┬───────────┬──────┘   └──────┬───────────┬──────┘
         │           │                 │           │                 │           │
    ┌────▼─────┐┌────▼─────┐      ┌────▼─────┐┌────▼─────┐      ┌────▼─────┐┌────▼─────┐
    │PostgreSQL││Elastic-  │      │ MongoDB  ││  Redis   │      │  MySQL   ││  PayPal  │
    │  (5432)  ││search9200│      │ (27017)  ││  (6379)  │      │  (3306)  ││ Sandbox  │
    └──────────┘└──────────┘      └──────────┘└──────────┘      └──────────┘└──────────┘
         │                             ▲                             ▲
         │                             │                             │
         └─────────────► [ RabbitMQ Event Bus (5672) ] ◄───────────────┘
                          - project.matched
                          - payment.released
                          - payment.failed
```

---

## 📦 Microservices Inventory & Database Isolation

| Microservice | Tech Stack | Data Stores | Responsibilities | Communication |
| :--- | :--- | :--- | :--- | :--- |
| **Discovery & Matching** (`discovery-service`) | Spring Boot 3.2, Java 21 | PostgreSQL (relational), Elasticsearch (full-text), Redis | Student profiles, project catalog, full-text skill search, automated AI recommendation scoring, RS256 JWT issuance | REST, GraphQL (`/graphql`), RabbitMQ (`project.matched` publisher) |
| **Collaboration Workspace** (`workspace-service`) | Node.js 18, Express, Socket.io | MongoDB (collaboration docs), Redis (pub/sub) | Project workspace rooms, real-time code snippet reviews, milestone notes, live multi-user team chat | REST, WebSocket (Socket.io), RabbitMQ consumer & publisher |
| **Escrow & Milestones** (`escrow-service`) | Spring Boot 3.2, Java 21 | MySQL 8.0, Flyway | Milestone escrow management, idempotent orders, cryptographic webhooks, audit trails | REST, PayPal Sandbox API, RabbitMQ (`payment.released` publisher) |
| **Unified Frontend** (`frontend`) | React 18, Vite, TypeScript, Tailwind CSS | Browser LocalStorage | Single unified portal for Startups, Tech Students, and Admins | Reverse Proxy to all 3 services, Socket.io, PayPal JS SDK |

---

## ⚡ Event Flow Lifecycle

1. **Project Matching:**
   - Startup posts a project or student requests an AI recommendation via `discovery-service`.
   - Once matched, `discovery-service` publishes a `project.matched` event to the RabbitMQ exchange `devcollab.exchange`.
2. **Workspace Provisioning:**
   - `workspace-service` receives `project.matched` and creates a dedicated collaboration workspace in MongoDB.
   - `escrow-service` receives `project.matched` and registers an escrow contract with required milestone deliverables in MySQL.
3. **Collaboration & Work Submission:**
   - Startup and student collaborate via real-time Socket.io in `workspace-service`.
   - Student submits deliverables for a milestone phase.
4. **Milestone Review & Escrow Release:**
   - Startup reviews and approves the submission.
   - Startup initiates release: `escrow-service` generates a PayPal Sandbox Order with currency `USD` and returns `approveUrl`.
   - Payment is captured either directly or via verified PayPal Webhook.
   - `escrow-service` publishes `payment.released` to RabbitMQ.
   - `workspace-service` receives `payment.released` and unlocks the subsequent milestone phase.

---

## 🚀 Quick Start (Docker Compose)

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend/workspace development)
- Java 21 & Maven 3.9+ (for local Spring development)

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your PayPal Sandbox Client ID & Secret from [PayPal Developer Dashboard](https://developer.paypal.com):
```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_MODE=sandbox
PAYPAL_CURRENCY=USD
```

### 3. Launch All 10 Containers
```bash
docker compose up -d --build
```

### 4. Container Services & Ports

| Service | Port | Endpoint |
| :--- | :--- | :--- |
| **Unified Frontend** | `http://localhost:5173` or `http://localhost:80` | Web UI |
| **Discovery Service** | `http://localhost:8081` | REST `/api/v1/projects`, GraphQL `/graphql` |
| **Workspace Service** | `http://localhost:5000` | REST `/api/v1/workspaces`, WebSocket `/socket.io` |
| **Escrow Service** | `http://localhost:8080` | REST `/api/v1/contracts`, `/api/v1/milestones` |
| **RabbitMQ Management** | `http://localhost:15672` | (guest / guest) |
| **Elasticsearch** | `http://localhost:9200` | Cluster Health |

---

## 🛠️ Local Development (Running Services Directly)

### 1. Discovery Service (Port 8081)
```bash
cd discovery-service
mvn spring-boot:run
```
- **GraphQL Endpoint:** `http://localhost:8081/graphql`
- **REST Endpoints:** `http://localhost:8081/api/v1/projects`, `http://localhost:8081/api/v1/matches`

### 2. Workspace Service (Port 5000)
```bash
cd workspace-service/backend
npm install
npm run dev
```
- **REST Endpoints:** `http://localhost:5000/api/v1/workspaces`
- **Socket.io Endpoint:** `ws://localhost:5000/socket.io/`

### 3. Escrow Service (Port 8080)
```bash
cd escrow-service
mvn spring-boot:run
```
- **REST Endpoints:** `http://localhost:8080/api/v1/contracts`, `http://localhost:8080/api/v1/milestones`, `http://localhost:8080/api/v1/transactions`

### 4. Unified Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & PayPal Sandbox Currency Compatibility

- **JWT Security:** All microservices share an asymmetric 2048-bit RS256 keypair located in `keys/` (`keys/private.pem` & `keys/public.pem`).
- **PayPal Currency Handling:** Escrow contracts, milestone captures, and PayPal SDK configurations default to `USD` (configurable via `PAYPAL_CURRENCY=USD`). This prevents PayPal Sandbox seller error: *"We're sorry. This seller doesn't accept payments in your currency"*.

---

## 🧪 Automated Testing

To run unit and integration test suites:

- **Escrow Service:**
  ```bash
  cd escrow-service && mvn clean test
  ```
  *(36 tests, 0 failures)*

- **Discovery Service:**
  ```bash
  cd discovery-service && mvn clean test
  ```
  *(6 tests, 0 failures)*

- **Frontend Production Build:**
  ```bash
  cd frontend && npm run build
  ```
