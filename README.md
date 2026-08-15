# DevCollab Freelance Platform

DevCollab is a microservice-based platform for technical students and startups. This repository currently contains the identity foundation (Person A) and the contract, milestone, and escrow payment service (Person C).

## Architecture

```text
Auth service (Person A, :8081) -- RS256 JWT --> Escrow service (Person C, :8080)
                                              |
React escrow SPA (:5173) -- /api proxy -------+
                                              |
                                      MySQL + RabbitMQ
                                              |
                                  PayPal Sandbox or mock provider
```

The escrow service consumes `project.matched`, stores the external project, startup, and student UUIDs on a contract, and publishes `payment.released` / `payment.failed`. Person B should preserve those event names and UUID fields.

## Repository structure

- `Discovery & Matching/` — Spring Boot authentication and JWKS service (Person A).
- `Payment Escrow & Milestone System/escrow-service/` — Spring Boot contracts, milestones, transactions, payment adapters, migrations, and AMQP consumers (Person C).
- `Payment Escrow & Milestone System/escrow-frontend/` — React/Vite dashboard for contracts, milestones, transactions, and audit logs.
- `Payment Escrow & Milestone System/API.md` and `EVENTS.md` — detailed API and event contracts.

## Technologies

Java 21, Spring Boot 3.2, Spring Security, JPA, Flyway, MySQL 8, RabbitMQ, PayPal Checkout REST API, React 18, TypeScript, Vite, Tailwind CSS, and Docker Compose.

## Prerequisites

- Docker Desktop with Compose (recommended), or Java 21 and Node.js 20+.
- A PayPal developer account and Sandbox business/buyer accounts only when testing `PAYMENT_PROVIDER=paypal`.

## Environment

Copy `Payment Escrow & Milestone System/.env.example` to `.env` in that directory and set values as needed. Do not commit it.

Important variables: `PAYMENT_PROVIDER` (`mock` or `paypal`), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox`, `PAYPAL_CURRENCY`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL`, database/RabbitMQ variables, `JWT_ISSUER`, and `JWT_PUBLIC_KEY`. `VITE_PAYPAL_CLIENT_ID` is public client configuration; the secret is backend-only.

## Run Person C locally

PowerShell:

```powershell
cd "Payment Escrow & Milestone System"
docker compose up --build -d
docker compose ps
```

Services: frontend `http://localhost:5173`, API `http://localhost:8080`, Swagger `http://localhost:8080/swagger-ui.html`, health `http://localhost:8080/actuator/health`, RabbitMQ `http://localhost:15672`.

For local processes, start MySQL and RabbitMQ first, then:

```powershell
cd "Payment Escrow & Milestone System\escrow-service"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev

cd ..\escrow-frontend
npm install
npm run dev
```

On Linux/macOS use `./mvnw` and the same `npm` commands.

## Run Person A

```powershell
cd "Discovery & Matching"
docker compose up --build
```

This compose file binds MySQL and RabbitMQ to the same host ports as Person C’s compose stack. Run one stack at a time, or change the published ports before running both. To integrate JWTs, configure the escrow service with the exact public key used by the auth service and `JWT_ISSUER=devcollab-auth`.

## Escrow lifecycle

1. A startup creates a contract and milestones.
2. A milestone is approved, then `POST /api/milestones/{id}/release` creates and persists a provider order using an `Idempotency-Key`.
3. The dashboard opens PayPal Checkout (or mock checkout).
4. `POST /api/transactions/{id}/capture` captures the provider order. The service only releases escrow after the provider returns `COMPLETED`.
5. The transaction becomes `SUCCESS`, the milestone becomes `RELEASED`, and `payment.released` is emitted. Verified provider webhooks can confirm the same flow and are deduplicated.

For PayPal Sandbox, set `PAYMENT_PROVIDER=paypal`, add Sandbox credentials, expose a reachable webhook URL if webhook testing is required, and use a Sandbox buyer account. Never use production credentials or switch `PAYPAL_MODE` to production for local testing.

## API overview

- `POST /api/contracts`, `GET /api/contracts/{id}` — contracts.
- `POST /api/milestones`, `POST /api/milestones/{id}/approve`, `POST /api/milestones/{id}/release` — milestones and payment order creation.
- `POST /api/transactions/{id}/capture`, `GET /api/transactions/{id}` — verified capture and payment state.
- `POST /api/payments/webhook` — provider callback, signature verified.
- `GET /api/audit` — admin audit trail.

All application endpoints require RS256 JWTs except health/docs and the signed webhook endpoint. Roles are `STARTUP`, `STUDENT`, and `ADMIN`; development authentication is enabled only by the `dev` Spring profile.

## Testing

```powershell
cd "Payment Escrow & Milestone System\escrow-service"
.\mvnw.cmd clean package -DskipTests
.\mvnw.cmd test

cd ..\escrow-frontend
npm install
npm run build
```

`npm run build` can be affected by Windows `cmd.exe` parsing because the parent directory includes `&`; running the equivalent Node commands from PowerShell is a safe workaround. The service suite uses H2 and mocked AMQP/payment dependencies; an actual PayPal Sandbox approval needs externally supplied Sandbox credentials and a buyer login.

## Troubleshooting

- Port `3306`, `5672`, or `15672` already used: stop the other compose stack or change its published ports.
- MySQL/RabbitMQ not ready: wait for `docker compose ps` to show healthy dependencies before calling the API.
- PayPal checkout fails: verify Sandbox client ID/secret, `PAYPAL_MODE=sandbox`, buyer account, currency, and return/cancel URLs.
- A webhook is rejected: register the webhook ID and preserve the raw payload plus PayPal transmission headers.
- Authentication fails: confirm the escrow public key matches the auth service signing key and issuer.

## Person B handoff

Person B can consume `payment.released` and `payment.failed`, publish `milestone.completed`, and use Person C contract/milestone UUIDs as opaque identifiers. Preserve the event schemas in `EVENTS.md`, the `Idempotency-Key` behavior, transaction status semantics, and the capture endpoint; do not set a milestone to `RELEASED` from the frontend or from an unverified event.
