# Docker Configuration Guide

## Problem Fixed

The original Docker setup had a **mismatch between Dockerfiles and docker-compose usage**:

- **Dockerfiles**: Designed for production (production-only dependencies, built static files)
- **docker-compose.yml**: Tried to run development commands (`npm run dev`) requiring dev dependencies
- **Result**: `vite: not found` and `nodemon: not found` errors

## Solution: Separate Development and Production Configurations

### Development Setup (Default)

**Files:**
- `backend/Dockerfile` - Development-friendly backend image
- `frontend/Dockerfile` - Development-friendly frontend image  
- `docker-compose.yml` - Development orchestration

**Usage:**
```bash
# Start development environment
docker-compose up

# With rebuild
docker-compose up --build
```

**Features:**
- ✅ **All dependencies installed** (including dev dependencies)
- ✅ **Hot reloading** via volume mounts
- ✅ **Fast development** with `npm run dev`
- ✅ **Source code sync** between host and container

### Production Setup

**Files:**
- `backend/Dockerfile.prod` - Production-optimized backend image
- `frontend/Dockerfile.prod` - Production-optimized frontend image
- `docker-compose.prod.yml` - Production orchestration

**Usage:**
```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up --build
```

**Features:**
- ✅ **Multi-stage builds** for smaller images
- ✅ **Production-only dependencies** for security
- ✅ **No volume mounts** (code baked into images)
- ✅ **Optimized static assets** (built frontend)

---

## File Structure

```
workspace-service/
├── backend/
│   ├── Dockerfile          # Development (includes nodemon)
│   ├── Dockerfile.prod     # Production (optimized)
│   └── ...
├── frontend/
│   ├── Dockerfile          # Development (includes vite)
│   ├── Dockerfile.prod     # Production (static build)
│   └── ...
├── docker-compose.yml      # Development environment
└── docker-compose.prod.yml # Production environment
```

---

## Changes Made

### 1. Backend Dockerfile (Development)

**Before:**
```dockerfile
# Production-only dependencies
RUN npm ci --only=production
# ❌ Missing nodemon for npm run dev
```

**After:**
```dockerfile
# All dependencies (including dev)
RUN npm ci
# ✅ Includes nodemon for development
```

### 2. Frontend Dockerfile (Development)

**Before:**
```dockerfile
# Multi-stage build for production
RUN npm run build
CMD ["serve", "-s", "dist", "-l", "3000"]
# ❌ Static files server, no hot reloading
```

**After:**
```dockerfile
# Simple development image
RUN npm ci  # Includes vite
CMD ["npm", "run", "dev"]
# ✅ Vite dev server with hot reloading
```

### 3. docker-compose.yml (Development)

**Improved:**
```yaml
volumes:
  - ./backend:/app
  - /app/node_modules  # Preserve container's node_modules
command: npm run dev   # Now works because nodemon is installed
```

### 4. Added Production Files

**New files for production use:**
- `Dockerfile.prod` files with multi-stage builds
- `docker-compose.prod.yml` for production deployment
- No volume mounts in production
- Restart policies for production reliability

---

## Development Workflow

### Start Development Environment
```bash
# Clone and setup
git clone <repo>
cd workspace-service

# Start all services (MongoDB, Redis, Backend, Frontend)
docker-compose up

# Or with rebuild
docker-compose up --build
```

### Services Available
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend**: http://localhost:5000 (Express with nodemon)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Hot Reloading Works
- Edit backend code → nodemon restarts server
- Edit frontend code → Vite hot-reloads browser
- No need to rebuild containers during development

### Stop Services
```bash
docker-compose down
```

---

## Production Deployment

### Build and Deploy
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production environment  
docker-compose -f docker-compose.prod.yml up -d
```

### Production Features
- **Optimized Images**: Multi-stage builds, smaller size
- **Security**: No dev dependencies in production
- **Performance**: Built static files, production optimizations
- **Reliability**: Restart policies, health checks

---

## Volume Strategy

### Development (with volumes)
```yaml
volumes:
  - ./backend:/app          # Source code sync
  - /app/node_modules       # Preserve container node_modules
```
- **Benefit**: Code changes reflect immediately
- **Trade-off**: Slightly slower due to volume mounting

### Production (no volumes)
```yaml
# No volumes - code is baked into image
```
- **Benefit**: Faster, more secure, immutable
- **Trade-off**: Need rebuild for code changes

---

## Environment Variables

### Development
```env
NODE_ENV=development
VITE_API_URL=http://localhost:5000  # Browser access
```

### Production
```env
NODE_ENV=production
VITE_API_URL=https://your-domain.com/api  # Configure for your domain
```

---

## Troubleshooting

### `nodemon: not found` Error
**Cause**: Using production Dockerfile for development
**Solution**: Use `docker-compose up` (not `docker-compose -f docker-compose.prod.yml up`)

### `vite: not found` Error  
**Cause**: Using production Dockerfile for development
**Solution**: Use `docker-compose up` (not `docker-compose -f docker-compose.prod.yml up`)

### Hot Reloading Not Working
**Check**: Volume mounts are configured correctly
```bash
docker-compose ps  # Check volume mounts
docker-compose logs frontend  # Check Vite logs
```

### Port Conflicts
**Solution**: Change ports in docker-compose.yml if 3000/5000 are in use
```yaml
ports:
  - "3001:3000"  # Use different host port
```

---

## Best Practices Applied

### 1. Separation of Concerns
- Development Dockerfiles for fast iteration
- Production Dockerfiles for optimized deployment
- Clear distinction between environments

### 2. Volume Strategy
- Development: Mount source code for hot reloading
- Production: Bake code into images for immutability

### 3. Dependency Management
- Development: All dependencies for tooling
- Production: Only runtime dependencies for security

### 4. Multi-stage Builds (Production)
- Build stage: Install deps, build assets
- Runtime stage: Only necessary files
- Result: Smaller, more secure images

This setup provides the best of both worlds: fast development iteration and optimized production deployment.