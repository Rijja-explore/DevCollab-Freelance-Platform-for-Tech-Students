# Workspace Service Architecture

## Project Structure

```
workspace-service/
├── backend/                 # Node.js/Express microservice
│   ├── src/
│   │   ├── controllers/     # HTTP request handlers (thin layer)
│   │   ├── routes/          # API endpoint definitions
│   │   ├── services/        # Business logic & orchestration
│   │   ├── models/          # Mongoose schemas & data models
│   │   ├── middleware/      # Express middleware (auth, logging, errors)
│   │   ├── config/          # External service connections
│   │   │   ├── database.js  # MongoDB connection
│   │   │   ├── redis.js     # Redis cache connection
│   │   │   └── environment.js # Environment validation
│   │   ├── sockets/         # WebSocket/Socket.io handlers
│   │   ├── rabbitmq/        # RabbitMQ message queue handlers
│   │   └── utils/           # Utility functions, helpers, logger
│   ├── app.js               # Express app factory
│   ├── server.js            # Server entry point & initialization
│   ├── package.json         # Dependencies
│   ├── Dockerfile           # Docker image definition
│   └── .dockerignore        # Files to exclude from Docker image
│
├── frontend/                # React/Vite SPA
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Full page components (routes)
│   │   ├── services/        # API client & external integrations
│   │   ├── hooks/           # Custom React hooks (future)
│   │   ├── contexts/        # Context API providers (future)
│   │   ├── layouts/         # Layout components (future)
│   │   ├── assets/          # Images, fonts, static files (future)
│   │   └── styles/          # Global & component CSS
│   ├── index.html           # HTML entry point
│   ├── vite.config.js       # Vite configuration
│   ├── package.json         # Dependencies
│   ├── Dockerfile           # Docker image definition
│   └── .dockerignore        # Files to exclude from Docker image
│
├── docker/                  # Docker-related files (future: custom scripts)
├── docs/                    # Documentation (API specs, guides)
├── docker-compose.yml       # Local development orchestration
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
└── README.md                # Project overview
```

## Folder Purposes & Responsibilities

### Backend Structure

#### `/src/controllers`
**Purpose:** Handle HTTP request/response logic  
**Responsibility:**
- Extract request data (params, body, query)
- Call services to process business logic
- Format and send HTTP responses
- NOT business logic — that's in services

**Example:**
```javascript
// controllers/workspaceController.js
export const createWorkspace = async (req, res, next) => {
  const { name, description } = req.body;
  const userId = req.user.id;
  
  try {
    const workspace = await workspaceService.create(name, description, userId);
    res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
};
```

#### `/src/routes`
**Purpose:** Define API endpoints and map to controllers  
**Responsibility:**
- Define route paths and HTTP methods
- Apply route-specific middleware
- Delegate to controllers
- Keep logic out of routes

**Example:**
```javascript
// routes/workspaces.js
const router = express.Router();

router.post('/', authenticate, createWorkspace);
router.get('/:id', authenticate, getWorkspace);

export default router;
```

#### `/src/services`
**Purpose:** Contain business logic and orchestration  
**Responsibility:**
- Implement feature business logic
- Interact with models and external services
- Do NOT depend on HTTP context (req/res)
- Be testable and reusable

**Example:**
```javascript
// services/workspaceService.js
export class WorkspaceService {
  async create(name, description, userId) {
    // Validate input
    // Create workspace document
    // Publish event to RabbitMQ
    // Update Redis cache
    // Return result
  }
}
```

#### `/src/models`
**Purpose:** Define data schemas using Mongoose  
**Responsibility:**
- Define MongoDB schema structure
- Set up field validation
- Create database indexes
- Keep to schema definition only (no business logic)

**Example:**
```javascript
// models/Workspace.js
const workspaceSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Workspace', workspaceSchema);
```

#### `/src/middleware`
**Purpose:** Handle cross-cutting concerns  
**Responsibility:**
- Authentication & authorization
- Request logging
- Error handling
- Rate limiting (future)
- Request validation (future)

**Key Files:**
- `errorHandler.js` — Global error catching and formatting
- `requestLogger.js` — HTTP request/response logging

#### `/src/config`
**Purpose:** External service connections and setup  
**Responsibility:**
- Initialize database connections
- Initialize cache connections
- Validate environment variables
- Export reusable connection instances
- Handle connection failures gracefully

**Key Files:**
- `database.js` — MongoDB connection, exported once, reused everywhere
- `redis.js` — Redis connection, exported once, reused everywhere
- `environment.js` — Environment validation at startup

**CRITICAL RULE:** DO NOT create connections directly in routes or services. Always use config module exports.

#### `/src/sockets`
**Purpose:** WebSocket/Socket.io event handlers  
**Responsibility:**
- Handle real-time connection events
- Call services for business logic
- Broadcast updates to connected clients

**Future events:** chat messages, typing indicators, online presence, comments

#### `/src/rabbitmq`
**Purpose:** Message queue event handlers  
**Responsibility:**
- Consume events from RabbitMQ
- Publish internal events
- Coordinate across microservices

**Future events:** milestone completion, workspace events

#### `/src/utils`
**Purpose:** Reusable utility functions  
**Responsibility:**
- Logging utility
- Validation helpers
- Data formatters
- Error builders
- Keep stateless and testable

#### `/app.js`
**Purpose:** Express application factory  
**Responsibility:**
- Create Express app instance
- Configure middleware (CORS, JSON parsing)
- Set up global error handler
- DO NOT start the server here

#### `/server.js`
**Purpose:** Server entry point  
**Responsibility:**
- Load environment variables
- Establish database connections
- Initialize cache and external services
- Start HTTP server
- Handle graceful shutdown

---

### Frontend Structure

#### `/src/components`
**Purpose:** Reusable React components  
**Responsibility:**
- Self-contained UI elements
- Props-based configuration
- Internal state management if needed
- Emit callbacks for parent communication

**Current:** Navbar, HealthStatus

#### `/src/pages`
**Purpose:** Full page components (route targets)  
**Responsibility:**
- Correspond to routes in App.jsx
- Compose multiple components
- Fetch page-level data
- Handle page logic and state

**Current:** Home

#### `/src/services`
**Purpose:** API client and external integrations  
**Responsibility:**
- Centralized HTTP requests
- Request/response interceptors
- Error handling
- Authentication header injection

**Current:** `api.js` — Axios instance and health check

#### `/src/styles`
**Purpose:** CSS files  
**Responsibility:**
- Global styles (index.css)
- Component-scoped styles
- Responsive design

#### `/src/hooks`
**Purpose:** Custom React hooks (future)  
**Examples:** useApi, useAuth, usePagination

#### `/src/contexts`
**Purpose:** Context API providers (future)  
**Examples:** AuthContext, ThemeContext

#### `/src/layouts`
**Purpose:** Layout wrapper components (future)  
**Examples:** AuthLayout, DashboardLayout

---

## Data Flow

### API Request Flow
```
Browser → Frontend Component
    ↓
Calls apiClient (services/api.js)
    ↓
Axios HTTP request
    ↓
Express Router (backend/routes)
    ↓
Controller extracts data
    ↓
Service executes business logic
    ↓
Model interacts with MongoDB
    ↓
Service returns result
    ↓
Controller formats response
    ↓
JSON response → Browser
```

### Real-Time Data Flow (Socket.io)
```
Frontend Component
    ↓
io.emit('event', data)
    ↓
Backend Socket Handler
    ↓
Service processes event
    ↓
io.emit('response') or broadcast
    ↓
Frontend receives update
```

---

## Key Principles

### 1. Separation of Concerns
- Controllers handle HTTP, services handle logic
- Models define schema, services use models
- Config handles connections, services use connections

### 2. Dependency Injection
- Pass dependencies as parameters
- Don't import models/services in every file
- Initialize connections in config, export instances

### 3. Error Handling
- Global error handler in middleware
- Services throw ApiError with statusCode
- Controllers catch and pass to next(error)

### 4. Reusability
- Utils are stateless functions
- Services are testable business logic
- Components accept props

### 5. Environment Safety
- All secrets in .env
- Validate environment at startup
- Never hardcode credentials

---

## Adding New Features

### Adding a new API endpoint

1. **Create Model** (`src/models/YourModel.js`)
   - Define schema and validation

2. **Create Service** (`src/services/yourService.js`)
   - Implement business logic
   - Use model, other services, external APIs

3. **Create Controller** (`src/controllers/yourController.js`)
   - Extract request data
   - Call service
   - Format response

4. **Create Route** (`src/routes/your.js`)
   - Define endpoints
   - Apply middleware
   - Map to controller

5. **Register Route** (`src/app.js`)
   - Import route
   - Add to Express app

---

## Development Workflow

### Local Setup
```bash
# Copy environment template
cp .env.example .env

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Start with Docker Compose (all services)
docker-compose up

# OR start individually
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Production Build
```bash
# Docker image
docker build -t workspace-backend:latest ./backend
docker build -t workspace-frontend:latest ./frontend

# Deploy
docker-compose -f docker-compose.prod.yml up
```

---

## Future Phases

### Phase 2: Workspace APIs
- Create workspace endpoint
- List workspaces endpoint
- Update workspace endpoint
- Delete workspace endpoint

### Phase 3: Chat & Messages
- Message model & schema
- Real-time chat via Socket.io
- Message history endpoint
- Search messages

### Phase 4: Threaded Comments
- Comment model
- Thread model
- Real-time comment notifications
- Comment search

### Phase 5: Presence & Indicators
- Online presence tracking
- Typing indicators
- Active user list

### Phase 6: Event Publishing
- RabbitMQ integration
- Milestone completion events
- Cross-service communication

---

## Deployment Considerations

- Use production environment variables
- Enable HTTPS in production
- Add rate limiting middleware
- Implement authentication (JWT from auth service)
- Add request validation middleware
- Monitor application logs
- Set up health checks (already in place)
- Configure auto-scaling if needed
- Use managed databases in production
