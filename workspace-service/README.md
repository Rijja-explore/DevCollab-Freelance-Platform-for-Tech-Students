# Workspace Service

A production-quality microservice for real-time workspace collaboration, including chat, threaded comments, online presence, and milestone tracking.

## Overview

This is one of three microservices in the system. It exclusively handles:
- Workspace creation
- Real-time chat
- Threaded comments
- Online presence
- Typing indicators
- Message history
- Milestone completion event publishing

Other microservices handle: login, user registration, project search, and payments.

## Tech Stack

**Backend:**
- Node.js + Express.js
- Socket.io (real-time)
- MongoDB + Mongoose
- Redis (caching)
- RabbitMQ (event bus)
- Docker

**Frontend:**
- React + Vite
- React Router
- Axios
- Socket.io Client

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Redis

### Installation

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev

# Using Docker Compose
docker-compose up
```

## Project Structure

See ARCHITECTURE.md for detailed folder structure explanation.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Backend
PORT=5000
MONGO_URI=mongodb://localhost:27017/workspace-service
REDIS_URL=redis://localhost:6379
JWT_PUBLIC_KEY_URL=https://auth-service/public-key

# Frontend
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Development

```bash
# Backend (with auto-reload)
npm run dev

# Frontend (with Vite dev server)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## API Documentation

(To be added with business logic implementation)

## License

MIT
