# Task: Fix Docker deployment + schema validation + run instructions

## Part A — Docker daemon / infra (completed)
- [x] Diagnosed: neither `docker compose` nor `mvnw spring-boot:run` worked because Docker Desktop's
      daemon was not running (no MySQL/RabbitMQ on localhost:3306/5672).
- [x] Located & launched Docker Desktop at C:\Users\rijja\AppData\Local\Programs\DockerDesktop
- [x] `docker compose up --build -d` — images built; mysql + rabbitmq healthy.

## Part B — Schema validation fix (in progress)
Problem: Hibernate `ddl-auto: validate` fails because enum columns are stored as VARCHAR in the
Flyway migrations but Hibernate 6 (MySQL dialect) validates `@Enumerated(EnumType.STRING)`
columns as native ENUM.
- [x] Confirm plan with user
- [x] Add `@JdbcTypeCode(SqlTypes.VARCHAR)` + imports to AuditLog.action
- [x] Add `@JdbcTypeCode(SqlTypes.VARCHAR)` + imports to Contract.status
- [x] Add `@JdbcTypeCode(SqlTypes.VARCHAR)` + imports to Milestone.status
- [x] Add `@JdbcTypeCode(SqlTypes.VARCHAR)` + imports to Transaction.status
- [x] Rebuild & restart: `docker compose up --build -d`
- [x] Verify escrow-service healthy + app reachable at :8080 / :5173
      (actuator/health → `{"status":"UP"}`; all 4 containers Up/healthy)

## Part C — README update (completed)
- [x] Added Windows/Docker Desktop startup warning (docker daemon note)
- [x] Updated Quick Start to use `docker compose up --build -d` + `docker compose ps`
- [x] Added PowerShell `$env:` examples for env vars
- [x] Clarified standalone backend needs MySQL/RabbitMQ (via `docker compose up -d mysql rabbitmq`)
- [x] Added a full Troubleshooting table + Useful Commands section

## Part D — Notes
- No changes to Flyway SQL migrations or the running database.
