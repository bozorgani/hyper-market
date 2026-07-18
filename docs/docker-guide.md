# Docker Guide — Hyper Market

> Complete Docker reference for development, testing, and production deployment.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Docker Compose Files Reference](#docker-compose-files-reference)
- [Dockerfile Architecture](#dockerfile-architecture)
- [Network Architecture](#network-architecture)
- [Environment Variables](#environment-variables)
- [Seeding Data](#seeding-data)
- [Backup and Restore](#backup-and-restore)
- [Troubleshooting](#troubleshooting)
- [Rebuild Strategy](#rebuild-strategy)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   frontend network                      │  │
│  │                                                        │  │
│  │  ┌──────────┐                        ┌──────────┐      │  │
│  │  │   web    │ ───── HTTP ──────────► │ backend  │      │  │
│  │  │ :3000    │                        │ :3001    │      │  │
│  │  └──────────┘                        └────┬─────┘      │  │
│  └───────────────────────────────────────────┼────────────┘  │
│                                              │               │
│  ┌───────────────────────────────────────────┼────────────┐  │
│  │                   backend network          │            │  │
│  │                                           │            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┴──┐         │  │
│  │  │  mongo   │  │  redis   │  │ meilisearch  │         │  │
│  │  │ :27017   │  │  :6379   │  │   :7700      │         │  │
│  │  └──────────┘  └──────────┘  └──────────────┘         │  │
│  │                                                        │  │
│  │                      ┌──────────┐                      │  │
│  │                      │  worker  │                      │  │
│  │                      └──────────┘                      │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `web` | `hyper-market-web:local` | 3000 | Next.js 16 frontend (standalone) |
| `backend` | `hyper-market-backend:local` | 3001 | NestJS API server |
| `worker` | `hyper-market-backend:local` | — | BullMQ background worker |
| `mongo` | `mongo:7` | 27017 | MongoDB with replica set |
| `redis` | `redis:7-alpine` | 6379 | Redis cache and queue broker |
| `meilisearch` | `getmeili/meilisearch:v1.12` | 7700 | Search engine |

---

## Quick Start

### Full Stack in Docker

```bash
# 1. Create environment file
cp .env.docker .env
# Edit .env and set secure values for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# PASSWORD_PEPPER, OTP_HASH_SECRET

# 2. Build and start all services
docker compose up --build -d

# 3. Wait for health checks (about 30-60 seconds)
docker compose ps

# 4. Verify services
curl http://localhost:3001/health/live
curl http://localhost:3000/health

# 5. Seed initial data (first time only)
docker compose exec backend node scripts/seed-permissions.js
docker compose exec backend node scripts/seed-admin.js
docker compose exec backend node scripts/seed-products.js
```

### Infrastructure Only (Local Development)

Run databases in Docker, backend and frontend on your host machine:

```bash
# 1. Start infrastructure
docker compose -f docker-compose.infra.yml up -d

# 2. Start backend (in terminal 1)
npm run backend:dev

# 3. Start frontend (in terminal 2)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1 npm run dev --workspace=apps/web
```

See also: [docs/local-dev-with-docker-infra.md](local-dev-with-docker-infra.md)

---

## Development Workflow

### Common Commands

```bash
# Build all images
docker compose build

# Build a specific service
docker compose build backend
docker compose build web

# Start all services
docker compose up -d

# View logs
docker compose logs -f              # all services
docker compose logs -f backend      # specific service
docker compose logs -f worker       # worker logs

# Stop all services
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v

# Restart a single service
docker compose restart backend

# Execute a command in a running container
docker compose exec backend sh
docker compose exec web sh

# Check service health
docker compose ps
```

### Hot Reload During Development

The Docker Compose setup runs production builds (no hot reload). For development with hot reload, use the infrastructure-only workflow:

```bash
# Start infrastructure in Docker
docker compose -f docker-compose.infra.yml up -d

# Run backend with watch mode on host
npm run backend:dev

# Run frontend with dev mode on host
npm run dev --workspace=apps/web
```

### Debugging

```bash
# View container logs
docker compose logs -f backend

# Enter a running container
docker compose exec backend sh

# Check container resource usage
docker stats

# Inspect a container
docker compose inspect backend

# View environment variables in a container
docker compose exec backend env
```

---

## Production Deployment

### Prerequisites

1. Docker Engine 24+ and Docker Compose V2
2. A `.env` file with production secrets (or Docker secrets configured)
3. A TLS termination proxy (nginx, traefik, or Caddy) in front of the services

### Step-by-Step Deployment

```bash
# 1. Create secrets directory
mkdir -p secrets
chmod 700 secrets

# 2. Generate secure secrets
openssl rand -base64 48 > secrets/jwt_access_secret.txt
openssl rand -base64 48 > secrets/jwt_refresh_secret.txt
openssl rand -base64 48 > secrets/password_pepper.txt
openssl rand -base64 48 > secrets/otp_hash_secret.txt
printf '%s' 'your-meili-master-key' > secrets/meili_master_key.txt

# 3. Create production .env file
cat > .env << 'EOF'
APP_ENV=production
JWT_ACCESS_SECRET=<paste from secrets/jwt_access_secret.txt>
JWT_REFRESH_SECRET=<paste from secrets/jwt_refresh_secret.txt>
PASSWORD_PEPPER=<paste from secrets/password_pepper.txt>
OTP_HASH_SECRET=<paste from secrets/otp_hash_secret.txt>
MEILI_MASTER_KEY=<your-meili-master-key>
CORS_ORIGINS=https://your-domain.com
PUBLIC_API_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SERVER_API_BASE_URL=http://backend:3001/api/v1
EOF

# 4. Build production images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# 5. Start production stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Verify health
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 7. Seed data (first time only)
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node scripts/seed-permissions.js
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node scripts/seed-admin.js
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node scripts/seed-products.js
```

### Production Checklist

- [ ] All secrets are set with cryptographically random values (min 32 chars)
- [ ] `APP_ENV=production` is set
- [ ] `SWAGGER_ENABLED=false` (default)
- [ ] `CORS_ORIGINS` only lists your production domain(s)
- [ ] TLS is terminated at the reverse proxy
- [ ] `MEILI_ENV=production` is set (done automatically in prod overlay)
- [ ] Resource limits are configured (done in prod overlay)
- [ ] Logging rotation is configured (done in prod overlay)
- [ ] Internal service ports (27017, 6379, 7700) are NOT published to host
- [ ] Database backups are scheduled
- [ ] Monitoring/alerting is configured

---

## Docker Compose Files Reference

| File | Purpose | Use With |
|------|---------|----------|
| `docker-compose.yml` | Base configuration (all services) | Standalone for dev |
| `docker-compose.prod.yml` | Production overlay (limits, logging, security) | `-f docker-compose.yml -f docker-compose.prod.yml` |
| `docker-compose.infra.yml` | Infrastructure only (mongo, redis, meilisearch) | `-f docker-compose.infra.yml` |
| `docker-compose.test.yml` | E2E test infrastructure (tmpfs, ephemeral) | `-f docker-compose.test.yml` |

### Compose Override Patterns

```bash
# Development (full stack)
docker compose up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Infrastructure only (for local dev)
docker compose -f docker-compose.infra.yml up -d

# E2E tests (ephemeral)
docker compose -f docker-compose.test.yml up -d --wait
npm run backend:test:e2e
docker compose -f docker-compose.test.yml down -v
```

---

## Dockerfile Architecture

### Backend (`apps/backend-api/Dockerfile`)

```
Stage 1 (deps):      Install all npm dependencies with BuildKit cache
Stage 2 (build):     Compile NestJS TypeScript → dist/
Stage 3 (prod-deps): Prune dev dependencies
Stage 4 (runner):    Minimal production image with dumb-init
```

### Web (`apps/web/Dockerfile`)

```
Stage 1 (deps):      Install all npm dependencies with BuildKit cache
Stage 2 (build):     Build Next.js with standalone output
Stage 3 (runner):    Minimal standalone server image with dumb-init
```

**Key optimization:** The web image uses Next.js `output: 'standalone'` which produces a self-contained server with only the needed `node_modules`. This reduces the image from ~900MB to ~250MB.

### Build Caching

Both Dockerfiles use BuildKit cache mounts for npm:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --progress=false
```

This caches downloaded packages across builds, making dependency installs much faster on rebuilds.

To use BuildKit:

```bash
DOCKER_BUILDKIT=1 docker compose build
# Or set it globally:
export DOCKER_BUILDKIT=1
```

---

## Network Architecture

Two isolated Docker bridge networks:

| Network | Services | Purpose |
|---------|----------|---------|
| `frontend` | web, backend | Public-facing HTTP traffic |
| `backend` | backend, worker, mongo, redis, meilisearch | Internal service communication |

**Security benefit:** The `web` container cannot directly access MongoDB, Redis, or Meilisearch. It can only reach the `backend` API through the `frontend` network.

---

## Environment Variables

### Required Variables (must be set)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_ACCESS_SECRET` | JWT access token signing key | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | JWT refresh token signing key | `openssl rand -base64 48` |
| `PASSWORD_PEPPER` | Password hashing pepper | `openssl rand -base64 48` |
| `OTP_HASH_SECRET` | OTP code hashing secret | `openssl rand -base64 48` |

### Important Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Set to `production` for production |
| `MEILI_MASTER_KEY` | (built-in default) | Meilisearch master API key |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `SWAGGER_ENABLED` | `false` | Enable Swagger docs |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api/v1` | Browser-facing API URL |
| `SERVER_API_BASE_URL` | `http://backend:3001/api/v1` | Server-side API URL (Docker internal) |

### File-Based Secrets

The backend supports Docker/Kubernetes file secrets via `KEY_FILE` variables. See [docs/secrets.md](secrets.md) for details.

---

## Seeding Data

After first deployment, seed the database:

```bash
# Seed permissions (RBAC)
docker compose exec backend node scripts/seed-permissions.js

# Seed admin user
docker compose exec backend node scripts/seed-admin.js

# Seed sample products
docker compose exec backend node scripts/seed-products.js

# Or seed everything at once
docker compose exec backend node scripts/seed-all.js
```

---

## Backup and Restore

### MongoDB Backup

```bash
# Create backup
docker compose exec mongo mongodump --archive=/tmp/backup.gz --gzip
docker compose cp mongo:/tmp/backup.gz ./backup-$(date +%Y%m%d).gz

# Restore backup
docker compose cp ./backup-20260718.gz mongo:/tmp/backup.gz
docker compose exec mongo mongorestore --archive=/tmp/backup.gz --gzip --drop
```

### Redis Backup

```bash
# Redis data is in append-only file mode (AOF)
# Copy the dump file
docker compose cp redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Meilisearch Backup

```bash
# Create snapshot
docker compose exec meilisearch curl -X POST http://localhost:7700/snapshots
# Copy data volume
docker run --rm -v hyper-market_meili-data:/data -v $(pwd):/backup alpine tar czf /backup/meili-backup-$(date +%Y%m%d).tar.gz /data
```

### Full Volume Backup

```bash
# Backup all volumes
for vol in mongo-data redis-data meili-data; do
  docker run --rm -v hyper-market_${vol}:/data -v $(pwd):/backup alpine \
    tar czf /backup/${vol}-$(date +%Y%m%d).tar.gz /data
done
```

---

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose logs <service-name>

# Check health status
docker compose ps

# Verify environment variables
docker compose exec <service-name> env
```

### MongoDB replica set not initialized

```bash
# Check replica set status
docker compose exec mongo mongosh --eval 'rs.status()'

# Re-initialize if needed
docker compose exec mongo mongosh --eval 'rs.initiate({_id: "rs0", members: [{ _id: 0, host: "mongo:27017" }]})'
```

### Backend can't connect to MongoDB

```bash
# Verify MongoDB is healthy
docker compose ps mongo

# Check network connectivity
docker compose exec backend ping mongo

# Check DATABASE_URL
docker compose exec backend echo $DATABASE_URL
```

### Worker not processing jobs

```bash
# Check worker logs
docker compose logs -f worker

# Verify Redis connectivity
docker compose exec worker node -e "const r=require('ioredis');new r('redis://redis:6379').ping().then(console.log)"
```

### Image build fails

```bash
# Clean build (no cache)
docker compose build --no-cache

# Build with verbose output
DOCKER_BUILDKIT=0 docker compose build

# Check available disk space
docker system df
```

### Port already in use

```bash
# Find process using the port
lsof -i :3001

# Or change the port mapping in .env
# Add: BACKEND_PORT=3002
# And update the ports section
```

### Out of disk space

```bash
# Remove unused images, containers, and networks
docker system prune

# Remove unused volumes (CAUTION: deletes data)
docker volume prune

# Full cleanup (CAUTION: removes everything unused)
docker system prune -a --volumes
```

---

## Rebuild Strategy

### When to rebuild

| Change Type | What to Rebuild | Command |
|-------------|-----------------|---------|
| Backend source code | `backend` + `worker` | `docker compose build backend worker` |
| Frontend source code | `web` | `docker compose build web` |
| `package.json` changes | Full rebuild | `docker compose build` |
| Dockerfile changes | Specific service | `docker compose build <service>` |
| Environment changes | Restart only | `docker compose up -d` |
| Infrastructure changes | Full rebuild | `docker compose build && docker compose up -d` |

### Fast rebuild tips

```bash
# Rebuild only what changed (BuildKit caches npm packages)
DOCKER_BUILDKIT=1 docker compose build backend

# Restart without rebuild (for env changes)
docker compose up -d

# Force recreate without rebuilding
docker compose up -d --force-recreate

# Build in parallel
docker compose build --parallel
```

### Clean rebuild

```bash
# Nuclear option: full clean rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

---

## CI/CD Integration

The project includes a GitHub Actions CI pipeline (`.github/workflows/ci.yml`) that runs:
- Secret scanning (Gitleaks)
- Security audit (npm audit)
- Backend build and unit tests
- Frontend lint and build
- Frontend E2E tests (Playwright)
- Backend E2E tests

Docker image building is not currently part of CI. To add it, consider:
- `docker buildx bake` for parallel multi-platform builds
- GitHub Actions cache for Docker layers
- Container registry push (GHCR, ECR, etc.)

---

## Additional Resources

- [Docker Audit Report](docker-audit-report.md) — Full audit findings
- [Secrets Management](secrets.md) — Secret handling best practices
- [Local Development with Docker Infra](local-dev-with-docker-infra.md) — Dev workflow guide
- [Docker Documentation (Farsi)](docker.md) — Persian documentation
