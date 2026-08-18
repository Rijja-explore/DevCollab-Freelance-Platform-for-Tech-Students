# Workspace Service — Environment Variables Reference

> **Source of truth:** Generated from `.env.example`, `src/config/environment.js`, `src/config/services.js`, `src/config/redis.js`, `src/utils/jwt.js`, and `server.js` as of Phase 6.

Variables marked **Required** will cause the service to exit at startup if absent.  
Variables marked **Optional** have sensible defaults and the service will start without them.

---

## Quick-Start Template

Copy this block into your `.env` file and fill in the values for your environment.

```dotenv
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*

# MongoDB
MONGO_URI=mongodb://localhost:27017/workspace-service
MONGO_DB_NAME=workspace-service

# Redis
REDIS_URL=redis://localhost:6379
REDIS_DB=0

# JWT
JWT_ALGORITHM=RS256
JWT_PUBLIC_KEY_PATH=keys/public.pem

# RabbitMQ (reserved for future use)
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# External Services
AUTH_SERVICE_URL=http://localhost:3001
AUTH_SERVICE_ENABLED=false
NOTIFICATION_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_ENABLED=false
SERVICE_TIMEOUT=5000

# Frontend (Vite)
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Server

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `PORT` | **Required** | — | TCP port the HTTP server listens on. Also used by Socket.IO. | `5000` |
| `NODE_ENV` | **Required** | — | Runtime environment. Affects logging and error verbosity. | `development` / `production` |
| `CORS_ORIGIN` | Optional | `*` | Allowed CORS origin(s) passed to the `cors` middleware. Set to a specific origin in production. | `https://app.example.com` |

---

## MongoDB

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `MONGO_URI` | **Required** | — | Full MongoDB connection string including database name. Used by `src/config/database.js` at startup. | `mongodb://localhost:27017/workspace-service` |
| `MONGO_DB_NAME` | Optional | _(part of URI)_ | Database name. Informational — the database is determined by the URI path segment. | `workspace-service` |

---

## Redis

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `REDIS_URL` | **Required** | — | Full Redis connection string. Used by `src/config/redis.js`. The client will attempt up to 10 reconnections with exponential backoff. | `redis://localhost:6379` |
| `REDIS_DB` | Optional | `0` | Redis logical database index. Informational — select the database via the URL if needed (`redis://localhost:6379/1`). | `0` |

---

## JWT / Authentication

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `JWT_PUBLIC_KEY_PATH` | **Required** | — | Path to the RS256 public key PEM file, relative to the working directory (`process.cwd()`). Used by both the REST `authenticate` middleware and the Socket.IO `socketAuthenticate` middleware. The key is loaded once and cached for the lifetime of the process. | `keys/public.pem` |
| `JWT_ALGORITHM` | Optional | `RS256` | JWT signing algorithm. Must match the algorithm used by the Auth Service to sign tokens. Only RS256 is tested and used. | `RS256` |

> **Note for Person A:** The public key file at `JWT_PUBLIC_KEY_PATH` must correspond to the private key used by the Auth Service to sign JWTs. When you are ready to provide the production key, replace the file at the configured path and restart the service. No code changes are required unless you are switching to JWKS, in which case only `src/utils/jwt.js` needs updating.

---

## RabbitMQ

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `RABBITMQ_URL` | Optional | `null` | AMQP connection string. Reserved for future use — RabbitMQ is not currently wired into any service logic. Included in `getConfig()` but not validated at startup. | `amqp://guest:guest@localhost:5672` |

---

## External Services

These variables control the integration layer in `src/config/services.js`. When a service is disabled (`false`), the corresponding client (`authClient.js` / `notificationClient.js`) uses its mock implementation automatically.

### Auth Service (Person A)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `AUTH_SERVICE_URL` | Optional | `http://localhost:3001` | Base URL of the Auth Service. Used when `AUTH_SERVICE_ENABLED=true`. | `http://auth-service:3001` |
| `AUTH_SERVICE_ENABLED` | Optional | `false` | Set to `true` to switch `authClient.js` from mock to live HTTP calls. Must be the string `"true"`. | `true` |

### Notification Service (Person C)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `NOTIFICATION_SERVICE_URL` | Optional | `http://localhost:3002` | Base URL of the Notification Service. Used when `NOTIFICATION_SERVICE_ENABLED=true`. | `http://notification-service:3002` |
| `NOTIFICATION_SERVICE_ENABLED` | Optional | `false` | Set to `true` to switch `notificationClient.js` from mock to live HTTP calls. Must be the string `"true"`. | `true` |

### Shared

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `SERVICE_TIMEOUT` | Optional | `5000` | HTTP request timeout in milliseconds applied to both Auth and Notification service calls. Parsed as an integer. | `5000` |

---

## Frontend (Vite)

These variables are consumed by the frontend Vite build, not by the Node.js backend. They are prefixed with `VITE_` so Vite exposes them to browser code.

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `VITE_API_URL` | Optional | — | Base URL the frontend uses for REST API calls. | `http://localhost:5000` |
| `VITE_SOCKET_URL` | Optional | — | Base URL the frontend uses for Socket.IO connection. Typically the same as `VITE_API_URL`. | `http://localhost:5000` |

---

## Logging

Logging is handled by `src/utils/logger.js`. The log level is driven by one environment variable.

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `LOG_LEVEL` | Optional | `info` | Winston log level. Valid values (lowest to highest verbosity): `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. | `debug` |

---

## Startup Validation

The following variables are checked by `src/config/environment.js` at process start. If any are missing the service logs an error and exits immediately (`process.exit(1)`):

```
PORT
NODE_ENV
MONGO_URI
REDIS_URL
JWT_PUBLIC_KEY_PATH
```

All other variables are optional and fall back to defaults if absent.

---

## Variable Reference by Category

| Variable | Category | Required | Default |
|----------|----------|----------|---------|
| `PORT` | Server | **Yes** | — |
| `NODE_ENV` | Server | **Yes** | — |
| `CORS_ORIGIN` | Server | No | `*` |
| `MONGO_URI` | MongoDB | **Yes** | — |
| `MONGO_DB_NAME` | MongoDB | No | _(from URI)_ |
| `REDIS_URL` | Redis | **Yes** | — |
| `REDIS_DB` | Redis | No | `0` |
| `JWT_PUBLIC_KEY_PATH` | JWT | **Yes** | — |
| `JWT_ALGORITHM` | JWT | No | `RS256` |
| `RABBITMQ_URL` | RabbitMQ | No | `null` |
| `AUTH_SERVICE_URL` | Auth Service | No | `http://localhost:3001` |
| `AUTH_SERVICE_ENABLED` | Auth Service | No | `false` |
| `NOTIFICATION_SERVICE_URL` | Notification Service | No | `http://localhost:3002` |
| `NOTIFICATION_SERVICE_ENABLED` | Notification Service | No | `false` |
| `SERVICE_TIMEOUT` | External Services | No | `5000` |
| `LOG_LEVEL` | Logging | No | `info` |
| `VITE_API_URL` | Frontend | No | — |
| `VITE_SOCKET_URL` | Frontend | No | — |
