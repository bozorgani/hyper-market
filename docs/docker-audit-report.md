# Docker Audit Report — Hyper Market

> **Auditor:** Senior DevOps Engineer (Arena.ai Agent Mode)
> **Date:** 2026-07-18
> **Repository:** `bozorgani/hyper-market`
> **Commit:** `427f233b52ca9250dad489e7bfb8813d0ec10737`

---

## 1. Executive Summary

This report covers a full Dockerization audit of the Hyper Market enterprise e-commerce monorepo. The stack consists of a Next.js 16 frontend, NestJS backend API, BullMQ worker, MongoDB, Redis, and Meilisearch, orchestrated via Docker Compose.

**Overall Grade: B- (Good foundation, significant optimization opportunities)**

The existing Docker setup demonstrates solid fundamentals — multi-stage builds, BuildKit cache mounts, non-root users, dumb-init, health checks, and a well-structured compose overlay system. However, several critical optimizations and security hardening measures are missing that would meaningfully improve production readiness, image size, build speed, and operational reliability.

---

## 2. Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose                               │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐                        │
│  │  mongo:7  │  │ redis:7  │  │meilisearch │                        │
│  │  :27017   │  │  :6379   │  │  :7700     │                        │
│  └────┬──────┘  └────┬─────┘  └──────┬─────┘                        │
│       │              │               │                              │
│       ├──────────────┼───────────────┤                              │
│       │         default network      │                              │
│       │              │               │                              │
│  ┌────┴──────────────┴───────────────┴───────┐                      │
│  │            backend (NestJS :3001)          │                      │
│  │       apps/backend-api/Dockerfile          │                      │
│  │    multi-stage: deps→build→prune→runner    │                      │
│  └─────────────────────┬─────────────────────┘                      │
│                        │                                            │
│  ┌─────────────────────┴─────────────────────┐                      │
│  │            worker (BullMQ)                 │                      │
│  │       same image as backend                │                      │
│  │       CMD: node apps/.../worker.js         │                      │
│  └───────────────────────────────────────────┘                      │
│                                                                     │
│  ┌───────────────────────────────────────────┐                      │
│  │            web (Next.js :3000)             │                      │
│  │         apps/web/Dockerfile                │                      │
│  │    multi-stage: deps→build→prune→runner    │                      │
│  └───────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Compose File Matrix

| File | Purpose | Services |
|------|---------|----------|
| `docker-compose.yml` | Full stack (dev/local) | mongo, redis, meilisearch, backend, worker, web |
| `docker-compose.prod.yml` | Production overlay | Resource limits, env overrides |
| `docker-compose.infra.yml` | Infra-only (local dev) | mongo, redis, meilisearch |
| `docker-compose.test.yml` | E2E test infra | mongo, redis, meilisearch (tmpfs) |

### Dockerfile Summary

| Image | Dockerfile | Base | Multi-stage | BuildKit | Non-root | dumb-init |
|-------|-----------|------|-------------|----------|----------|-----------|
| backend | `apps/backend-api/Dockerfile` | `node:20-bookworm-slim` | ✅ 4 stages | ✅ cache mount | ✅ `node` | ✅ |
| web | `apps/web/Dockerfile` | `node:20-bookworm-slim` | ✅ 4 stages | ✅ cache mount | ✅ `node` | ✅ |

---

## 3. Problems List

### 🔴 CRITICAL

#### C-1: Next.js missing `output: 'standalone'`

**File:** `apps/web/next.config.ts`
**Impact:** Image size, deployment reliability, cold start time

The Next.js config does not set `output: 'standalone'`. Without this, the production runner image must include the **entire monorepo `node_modules`** (including backend dependencies like `bcrypt`, `mongoose`, `jsdom`, etc.) just to run the frontend. This causes:

- **Image size inflation:** ~800MB+ instead of ~200MB with standalone
- **Unnecessary attack surface:** Backend native modules (`bcrypt`, `mongoose`) in the frontend image
- **Slower cold starts:** More files to load at runtime

The standalone output mode produces a self-contained `standalone/` directory with only the needed files.

#### C-2: Monorepo `node_modules` contamination in both images

**Files:** Both Dockerfiles
**Impact:** Image size, security surface, build time

Both Dockerfiles install the **entire monorepo's dependencies** because `npm ci` runs at the workspace root. The backend image includes frontend dependencies (`next`, `react`, `tailwindcss`, `playwright`, etc.) and the web image includes backend dependencies (`bcrypt`, `mongoose`, `jsdom`, `swagger-ui-express`, etc.).

Estimated waste:
- Backend image: ~150MB of unnecessary frontend packages
- Web image: ~300MB+ of unnecessary backend packages (before standalone fix)

#### C-3: No `.env` file exists for Docker Compose

**Impact:** Compose startup failure

`docker-compose.yml` uses `${JWT_ACCESS_SECRET:?...}`, `${PASSWORD_PEPPER:?...}`, and `${OTP_HASH_SECRET:?...}` with required-variable syntax. Without a `.env` file at the project root, `docker compose up` will fail immediately. Only `.env.example` files exist in app subdirectories.

---

### 🟠 HIGH

#### H-1: No Docker Compose network segmentation

**File:** `docker-compose.yml`
**Impact:** Security, blast radius

All 6 services share the single default Docker bridge network. There is no network isolation between:
- Public-facing services (web, backend)
- Internal infrastructure (mongo, redis, meilisearch)
- Background workers (worker)

Best practice: separate `frontend`, `backend`, and `infra` networks so only required connections are possible.

#### H-2: Worker service has no health check

**File:** `docker-compose.yml`
**Impact:** Orchestration reliability, monitoring

The `worker` service has no `healthcheck` directive. Compose and orchestrators cannot detect if the worker process has crashed or is unresponsive. The backend and web services both have health checks.

#### H-3: Meilisearch has no health check in main compose

**File:** `docker-compose.yml`
**Impact:** Startup ordering reliability

The `meilisearch` service uses `condition: service_started` (not `service_healthy`) in backend/worker `depends_on` because there is no health check defined. This means backend/worker may start before Meilisearch is ready to accept connections.

#### H-4: Production overlay missing logging config

**File:** `docker-compose.prod.yml`
**Impact:** Operational visibility, disk space

No logging driver or rotation is configured. In production, container logs can grow unbounded and fill disk space.

#### H-5: Production overlay missing Docker secrets

**File:** `docker-compose.prod.yml`
**Impact:** Security

Secrets (JWT keys, passwords, API keys) are passed as environment variables. While the backend supports `KEY_FILE` secrets, the prod compose overlay doesn't use Docker's `secrets:` feature. Environment variables are visible in `docker inspect` and process listings.

#### H-6: All ports published to host in development compose

**File:** `docker-compose.yml`
**Impact:** Security, port conflicts

MongoDB (27017), Redis (6379), and Meilisearch (7700) ports are published to the host. In production, only the web (3000) and backend (3001) ports should be externally accessible. Internal services should only be reachable within the Docker network.

---

### 🟡 MEDIUM

#### M-1: Web CMD uses `npm run start` instead of direct `next start`

**File:** `apps/web/Dockerfile`
**Impact:** Process management, signal handling

The web container's `CMD` is `["npm", "run", "start", "--workspace=apps/web"]`. This spawns `npm` as PID 1 (mitigated by `dumb-init`), adds npm overhead, and makes log output noisier. Should directly invoke `node apps/web/.next/standalone/server.js` (with standalone) or `npx next start`.

#### M-2: No Node.js runtime flags for production

**Files:** Both Dockerfiles
**Impact:** Memory management, performance

No `--max-old-space-size`, `--enable-source-maps`, or other Node.js runtime optimization flags. In memory-constrained containers, Node.js default heap sizing may cause OOM kills.

#### M-3: `.dockerignore` could be more comprehensive

**File:** `.dockerignore`
**Impact:** Build context size, build speed

Current `.dockerignore` is reasonable but could exclude additional files:
- `docs/` directory
- `AGENT_RULES.md`, `PROJECT_CONTEXT.md`, `PROJECT_MAP.md`, `PROJECT_SUMMARY_FA.md`, `README.md`, `TECH_FREEZE.md`
- `.gitleaks.toml`
- `docker-compose*.yml` files
- `.github/`

#### M-4: No `HEALTHCHECK` in Dockerfiles

**Files:** Both Dockerfiles
**Impact:** Portability

Health checks are only defined in compose files. If images are used outside compose (e.g., `docker run`, Kubernetes without probes), there's no default health check.

#### M-5: No image labels/metadata

**Files:** Both Dockerfiles
**Impact:** Traceability

No `LABEL` directives for version, maintainer, build date, git commit, or description. This makes it harder to track image provenance.

#### M-6: Backend prod-deps stage includes web package.json

**File:** `apps/backend-api/Dockerfile`
**Impact:** Image size

The `prod-deps` stage prunes dev dependencies from the full monorepo `node_modules`, but still keeps web runtime dependencies. The `apps/web/package.json` is copied in the deps stage for workspace resolution.

#### M-7: No `STOPSIGNAL` directive

**Files:** Both Dockerfiles
**Impact:** Graceful shutdown

Neither Dockerfile specifies `STOPSIGNAL`. While `dumb-init` handles signal forwarding, explicitly setting `STOPSIGNAL SIGTERM` documents the expected shutdown signal.

---

### 🟢 LOW

#### L-1: No Docker Bake / build matrix for CI

**File:** `.github/workflows/ci.yml`
**Impact:** CI build speed, consistency

CI doesn't build Docker images. Adding `docker buildx bake` would enable parallel multi-platform builds and consistent CI/local image building.

#### L-2: No explicit `SHELL` directive

**Files:** Both Dockerfiles
**Impact:** Build reproducibility

The default shell is `/bin/sh` on Debian. This is fine but explicitly setting `SHELL ["/bin/bash", "-o", "pipefail", "-c"]` enables pipefail for safer `RUN` commands.

#### L-3: No build cache exported/imported in CI

**Impact:** CI build speed

No GitHub Actions cache integration for Docker layers. Each CI run builds from scratch.

#### L-4: Scripts directory copied to backend runner unnecessarily

**File:** `apps/backend-api/Dockerfile`
**Impact:** Image size (minimal)

The `scripts/` directory is copied to the runner image for seed commands. This is acceptable for operational needs but adds ~30KB.

---

## 4. Risk Assessment Matrix

| ID | Problem | Risk | Impact | Likelihood | Priority |
|----|---------|------|--------|------------|----------|
| C-1 | No standalone Next.js output | 🔴 Critical | High image size, slow deploys | Certain | P0 |
| C-2 | Monorepo node_modules contamination | 🔴 Critical | 300-500MB wasted per image | Certain | P0 |
| C-3 | No .env file for compose | 🔴 Critical | Compose won't start | Certain | P0 |
| H-1 | No network segmentation | 🟠 High | Security breach surface | Possible | P1 |
| H-2 | No worker health check | 🟠 High | Undetected worker crashes | Likely | P1 |
| H-3 | No Meilisearch health check | 🟠 High | Race condition on startup | Likely | P1 |
| H-4 | No prod logging config | 🟠 High | Disk exhaustion | Likely | P1 |
| H-5 | No Docker secrets in prod | 🟠 High | Secret exposure | Possible | P1 |
| H-6 | All ports published | 🟠 High | Unauthorized DB access | Possible | P1 |
| M-1 | npm as web CMD | 🟡 Medium | Process overhead | Certain | P2 |
| M-2 | No Node.js runtime flags | 🟡 Medium | OOM kills | Possible | P2 |
| M-3 | Incomplete .dockerignore | 🟡 Medium | Slower builds | Certain | P2 |
| M-4 | No Dockerfile HEALTHCHECK | 🟡 Medium | Reduced portability | Possible | P2 |
| M-5 | No image labels | 🟡 Medium | Traceability gaps | Certain | P2 |
| M-6 | Backend includes web deps | 🟡 Medium | ~150MB waste | Certain | P2 |
| M-7 | No STOPSIGNAL | 🟡 Medium | Shutdown ambiguity | Unlikely | P2 |
| L-1 | No Docker Bake in CI | 🟢 Low | Slower CI | Possible | P3 |
| L-2 | No SHELL directive | 🟢 Low | Build edge cases | Unlikely | P3 |
| L-3 | No CI build cache | 🟢 Low | Slower CI | Certain | P3 |
| L-4 | Scripts in runner image | 🟢 Low | 30KB overhead | Certain | P3 |

---

## 5. Recommended Improvements

### Phase 1: Critical Fixes (P0)

1. **Add `output: 'standalone'` to `next.config.ts`**
   - Update Dockerfile to copy `apps/web/.next/standalone` instead of full `.next`
   - Copy `apps/web/.next/static` separately for static assets
   - Expected image size reduction: ~60-70%

2. **Optimize dependency installation per service**
   - For web: After standalone, only copy standalone server + static files
   - For backend: Keep current strategy but ensure only backend package.json triggers rebuilds

3. **Create `.env.example` at project root**
   - Provide a template with all required variables
   - Document the `.env` creation process

### Phase 2: High Priority (P1)

4. **Add Docker Compose networks**
   - `frontend` network: web ↔ backend
   - `backend` network: backend ↔ mongo, redis, meilisearch
   - `worker` network: worker ↔ mongo, redis, meilisearch

5. **Add worker and Meilisearch health checks**

6. **Enhance `docker-compose.prod.yml`**
   - Add logging driver configuration
   - Add Docker secrets for sensitive values
   - Add resource limits for all services
   - Add `read_only: true` where possible

7. **Restrict port publishing in production**
   - Remove host port bindings for mongo, redis, meilisearch in prod

### Phase 3: Medium Priority (P2)

8. **Optimize web CMD to use direct node invocation**
9. **Add Node.js runtime flags**
10. **Improve `.dockerignore`**
11. **Add `HEALTHCHECK` and `LABEL` to Dockerfiles**
12. **Add `STOPSIGNAL SIGTERM`**

### Phase 4: Low Priority (P3)

13. **Add Docker Bake configuration for CI**
14. **Add build cache export/import in CI**

---

## 6. Migration Plan

### Step 1: Audit Report & Documentation (this document)
- Create comprehensive audit report
- Document all findings

### Step 2: Next.js Standalone Optimization
- Add `output: 'standalone'` to `next.config.ts`
- Rewrite web Dockerfile for standalone output
- Validate build and runtime

### Step 3: Dockerfile Hardening
- Add HEALTHCHECK, LABEL, STOPSIGNAL
- Optimize .dockerignore
- Add Node.js runtime flags
- Fix web CMD

### Step 4: Docker Compose Architecture
- Add network segmentation
- Add missing health checks
- Create `.env.docker` template
- Enhance production overlay

### Step 5: Security Hardening
- Docker secrets in prod overlay
- Restrict port publishing
- Read-only filesystems
- Logging configuration

### Step 6: Developer Experience
- Update docker-guide.md
- Validate full stack
- Smoke tests

### Step 7: Final Validation & Commit
- `docker compose config` validation
- `docker compose build` success
- `docker compose up` health
- Application smoke tests
- Git commit and push

---

## 7. Build Performance Comparison (Estimated)

| Metric | Before | After (projected) |
|--------|--------|-------------------|
| Web image size | ~900MB | ~250MB |
| Backend image size | ~700MB | ~550MB |
| Build context | ~15MB | ~10MB |
| Cold start (web) | ~8s | ~3s |
| Rebuild on code change | ~45s | ~20s |
| Rebuild on dep change | ~90s | ~60s |

---

## 8. Security Improvement Summary

| Area | Current | After |
|------|---------|-------|
| Network isolation | ❌ Single default network | ✅ Segmented networks |
| Port exposure | ❌ All ports published | ✅ Only public ports |
| Secrets management | ⚠️ Env vars | ✅ Docker secrets + env vars |
| Container filesystem | ⚠️ Read-write | ✅ Read-only where possible |
| Image attack surface | ❌ Full monorepo deps | ✅ Minimal production deps |
| Logging | ⚠️ Unbounded | ✅ Rotation configured |
| Health monitoring | ⚠️ Partial | ✅ All services monitored |
| Non-root execution | ✅ `node` user | ✅ `node` user |
| Signal handling | ✅ `dumb-init` | ✅ `dumb-init` |
| Security headers | ✅ `helmet` | ✅ `helmet` |
