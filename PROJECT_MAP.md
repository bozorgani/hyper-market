# Hyper Market — PROJECT MAP (Phase 1: Analysis)

> **Status of this document:** Architecture analysis only. No code was modified.
> Prepared by the Senior Full‑Stack Enterprise Architect (analyst mode).
> **Important:** Several findings below correct inaccuracies in the legacy `docs/PROJECT_STATE.md`
> (that file is stale — it references `apps/frontend` / `apps/frontend-web` which **no longer exist**;
> the only frontend is `apps/web`).

---

## 0. TL;DR (Project Understanding Summary)

Hyper Market is an **npm‑workspaces monorepo** for a single‑vendor ("warehouse") enterprise e‑commerce platform
(inspired by Digikala / Snapp Market), fully Persian + RTL. It is in **"architecture complete, development not started"**
state: the codebase is richly implemented and architecturally mature, but **no real third‑party integrations exist**
(payment, SMS/email, search is local‑dev‑only by default) and there is **no production deployment hardening** yet.

- **Backend:** `apps/backend-api` — NestJS 11, MongoDB/Mongoose, Redis (ioredis), BullMQ, Meilisearch, Winston, Swagger.
- **Frontend:** `apps/web` — Next.js (App Router), React 19, TypeScript, Tailwind v4, local shadcn‑style `ui/*` components, Zustand, TanStack Query, Framer Motion, Axios.
- **Monorepo tooling:** husky, `scripts/reindex-products-search.js`, `scripts/sync-project-state.js`.
- **Auth:** OTP + JWT (access/refresh) with **cookie‑based storage**, httpOnly + CSRF double‑submit, refresh‑token family/rotation, reuse detection, account lockout, RBAC + static permission map, audit logging, bcrypt+pepper, distributed‑lock idempotency. This is genuinely enterprise‑grade.
- **Core architectural patterns:** Modular NestJS, **Repository pattern**, `Controller → Service → Repository → Mongoose → MongoDB`, in‑memory `EventBus` (Phase 1), global `Mongoose` transactions for order/payment/cart flows.

**Bottom line:** The architecture is sound and the auth/security subsystem is production‑quality. The work remaining is
*integration & ops hardening* (real payment, real SMS/email, search infra, workers, caching, pagination, tests, deployment),
not architectural change.

---

## 1. Repository / Workspace Layout

```text
hyper-market/
├── package.json                 # npm workspaces root; scripts: install:all, backend:*, sync:state, search:reindex
├── TECH_FREEZE.md               # strict "no tech changes" policy
├── AGENT_RULES.md               # cleanup/modification rules
├── PROJECT_SUMMARY_FA.md        # Persian PRD summary
├── docs/                        # design docs (auth-domain, phases 1–5, stack decision) – partly stale
├── scripts/
│   ├── reindex-products-search.js   # standalone Mongo→Meilisearch full reindex (works outside Nest)
│   └── sync-project-state.js        # regenerates docs/PROJECT_STATE.md (source of stale file)
└── apps/
    ├── backend-api/             # NestJS API
    │   └── src/
    │       ├── main.ts          # bootstrap: helmet, CORS, global prefix /api/v1, versioning, swagger, exception filter, validation pipe
    │       ├── app.module.ts    # root wiring + global ThrottlerGuard + CSRF middleware
    │       ├── config/          # database, env (+validation), jwt, redis, swagger
    │       ├── core/            # events (EventBus) + exceptions + filters
    │       ├── infrastructure/  # cache(redis), database(transaction), health, idempotency, logger(winston), security
    │       ├── modules/         # auth, users, permissions, audit, products, categories, cart, orders, payments, search, analytics, mail, queue
    │       └── shared/          # base-repository interface, entity-id util, validators
    └── web/                     # Next.js App Router frontend (SPA+SSR hybrid)
        └── src/
            ├── app/             # / , /login, /register, /verify-otp, /products, /products/[id], /search, /cart, /checkout, /orders, /order/success, /profile, /admin/*
            ├── components/       # layout, auth, admin, product-card, order-card, ui/* (shadcn-style local components)
            ├── features/admin/   # admin-api
            ├── hooks/            # TanStack Query hooks: use-cart, use-orders, use-products, use-search, use-analytics, use-debounce
            ├── lib/              # axios api client (CSRF + refresh queue), analytics, idempotency, validation, utils
            ├── providers.tsx     # TanStack Query + Toast provider
            ├── services/api.ts   # Axios instance: withCredentials, CSRF header, 401 refresh-queue, Persian error map
            ├── store/auth-store.ts # Zustand auth store (sessionStorage user + localStorage deviceId)
            ├── proxy.ts          # request proxy: protects /admin by role via JWT claim
            └── types/domain.ts
```

---

## 2. Architecture Overview

### 2.1 Layered backend architecture (Controller → Service → Repository → Mongoose)

Every domain module follows:

```
HTTP Request
  → Guard(s): JwtAuthGuard → RolesGuard → PermissionsGuard   (all global APP_GUARD, registered in AuthModule)
  → Controller (validation DTO, auth context only)
  → Service (business logic, orchestration, transactions, events)
  → Repository (Mongoose model access only — never DB access in controllers/services directly)
  → Mongoose Model → MongoDB
```

Cross‑cutting services are `@Global()`:
- `EventBusModule` (in‑memory pub/sub)
- `InfrastructureModule` → `CacheModule` (Redis), `IdempotencyModule`, `LoggerService` (Winston), `DatabaseTransactionService`
- `QueueModule` (BullMQ)

### 2.2 Global request pipeline (`main.ts` + `app.module.ts`)

| Concern | Mechanism |
| --- | --- |
| Global prefix | `api/v1` (URI versioning, neutral default); `/health` excluded |
| Security headers | `helmet` (CSP defaults, HSTS, X‑XSS) |
| CORS | dynamic origin check from `CORS_ORIGINS`; **wildcard rejected in production**; credentials enabled |
| CSRF | `CsrfProtectionMiddleware` on all non‑safe methods; double‑submit cookie `hyper_market_csrf_token`; checks trusted origin |
| Rate limiting | `@nestjs/throttler` named limits: `default(100)`, `auth(5)`, `sensitive(10)`; **in‑memory storage (not shared)** |
| Validation | global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform) |
| Errors | global `HttpExceptionFilter` |
| Docs | Swagger (no auth on docs) |
| Lifecycle | shutdown hooks enabled |

### 2.3 Authentication subsystem (the strongest part of the codebase)

- **Credentials:** dual secret JWT (access `15m`, refresh `30d`), signed with issuer/audience; secrets from config.
- **Storage:** tokens set as **httpOnly cookies** (`hyper_market_access_token`, `hyper_market_refresh_token`) + non‑httpOnly CSRF cookie. `AUTH_RETURN_TOKENS_IN_BODY=true` can return tokens in body instead.
- **Strategies/guards:** `JwtStrategy` extracts from Bearer **or** cookie; `JwtAuthGuard` (honors `@Public()`), `RolesGuard`, `PermissionsGuard` all registered globally.
- **Refresh‑token lifecycle:** stored hashed (`sha256`) in `refresh_tokens`; **rotation with `tokenFamilyId`**, `jti`, reuse‑detection (`reuseDetected`, `revokedAt`), family revocation on reuse; `tokenVersion` bump on password reset/logout invalidates all sessions.
- **Sessions:** `sessions` collection (deviceId, ip, ua, expiresAt, isTrusted).
- **Account protection:** failed login counter (5) → lockout (15m); `lockedUntil`.
- **OTP:** MongoDB `otp_codes` + Redis **lockout/attempt** counters; SHA‑256 code hash; 5 attempts → block.
- **Auditing:** `audit_logs` written on every security event (login fail/success, logout, token refresh, password change, account lock) — failures swallowed so they never break auth flow.
- **Idempotency:** Redis‑backed `IdempotencyService` (hash + lock + replay) on payment endpoints.

### 2.4 Domain modules

| Module | Behavior summary | Notes / quality |
| --- | --- | --- |
| **auth** | register, login, refresh, logout, send/verify OTP (email+phone), verify‑email/phone, forgot/reset password | enterprise‑grade; OTP *delivery* is stubbed |
| **users** | list/get, block/unblock (`@Permissions('users.ban')`) | no pagination |
| **permissions** | `Permission` schema + static `ROLE_PERMISSIONS` map | DB permissions **orphaned** (guard uses constant) |
| **audit** | `AuditLogRepository` only (no controller; consumed by auth) | infra‑only |
| **products** | CRUD, list (page/limit/category), update, soft‑delete, **image upload** (multer→local disk), stock reduce/restore | re‑indexes Meilisearch on create/update/delete |
| **categories** | CRUD (name/slug, unique slug) | no pagination |
| **cart** | per‑user single cart, add/update/remove/clear, detailed summary, **Redis cart lock** | stock re‑validated at order time |
| **orders** | create (price snapshot + stock check inside **transaction**), list/byId/my, status transition FSM, cancel (restores stock) | **not idempotent** |
| **payments** | create payment for pending order, **simulate‑success**, verify, mark‑failed | **mock only**, no gateway/callback |
| **search** | Meilisearch service, indexer, BullMQ retry queue + worker, event subscriber, public suggest/search + admin search | `require('meilisearch')` interleaved; 3 client instantiations |
| **analytics** | event store + dashboard/revenue/products/search/funnel aggregations; public track endpoint; EventBus subscribers | **double‑count** risk (frontend + backend both emit order/paid) |
| **outbox** *(Phase 2 — new)* | `outbox_events` store + `OutboxService` + `OutboxRelayWorker` (BullMQ). Makes domain events durable & crash‑safe | none known |
| **mail** | `MailService` + `SmsIrService` + `MailWorker` (BullMQ) | **no‑op** (logs only) |
| **queue** | `@Global` `QueueService` (BullMQ) | workers run **in‑process** |

### 2.5 Infrastructure

- **MongoDB/Mongoose:** Mongoose 9, transactional flows via `DatabaseTransactionService` (startSession/commit/abort) with **non‑prod fallback to no‑transaction** when replica set unavailable.
- **Redis:** `ioredis` `RedisService` (lazy connect) for OTP lockout, cart lock, idempotency cache. *Dead provider* `redis.provider.ts` (uses `redis` pkg) is unused.
- **BullMQ:** search‑indexing queue + mail queue, each with an in‑process `Worker` (`OnModuleInit`).
- **Meilisearch:** index `products` with searchable/filterable/sortable attributes; direct index + async retry; standalone reindex script.
- **Winston:** `LoggerService` + config (winston transports).
- **Health:** `/health` returns status only — **no downstream dependency checks**.

### 2.6 Frontend (`apps/web`)

- App Router, Persian/RTL (`<html lang="fa" dir="rtl">`, Tailwind v4 `@import "tailwindcss"`, Vazirmatn font).
- **Axios `api.ts`:** `withCredentials`, CSRF header on unsafe methods from cookie, **401 refresh queue** (single in‑flight refresh + failed‑queue), Persian error mapping, `idempotency-key` header support.
- **Auth:** Zustand `auth-store` (re‑hydrates via `/auth/me`, stores user in sessionStorage, deviceId in localStorage).
- **Server guard:** `proxy.ts` protects `/admin/*` with a fast JWT role-claim check; backend RBAC remains authoritative.
- **Data fetching:** TanStack Query hooks per domain; analytics events throttled client‑side and POSTed to `/analytics/event`.
- **shadcn/ui:** implemented as local `components/ui/*` (button, card, input, toast, dialog, skeleton, …) — consistent with "shadcn/ui" requirement without the CLI dependency.

---

## 3. Module Dependency Graph

### 3.1 Compile‑time imports (who imports whom)

```text
AppModule
├── ConfigModule (global)
├── MongooseModule.forRootAsync
├── ThrottlerModule
├── EventBusModule (global)
│   └── OutboxModule (outbox_events store, OutboxService, OutboxRelayWorker via BullMQ)
├── InfrastructureModule (global): CacheModule, IdempotencyModule, LoggerService, DatabaseTransactionService
├── SecurityModule: PasswordService, TokenHashService, TokenService, CsrfMiddleware
├── AnalyticsModule ──┐
├── AuthModule       (exports Auth/Otp/Session/RefreshToken services)
│   ├── UsersModule
│   ├── PermissionsModule  (PermissionRepository, PermissionsGuard)
│   ├── AuditModule        (AuditLogRepository)
│   └── MailModule ── QueueModule (global)
│        └── SmsIrService, MailService, MailWorker
├── UsersModule
├── ProductsModule  (exports ProductsService, ProductsRepository, ProductImageStorageService)
│   ├── CategoriesModule
│   └── SearchModule  (exports SearchIndexer, SearchService)
│        └── CategoriesModule
├── CategoriesModule
├── CartModule ── ProductsModule
├── OrdersModule ── CartModule, ProductsModule
└── PaymentsModule ── OrdersModule
```

### 3.2 Runtime event flow (in‑memory `EventBus`)

```text
Order/Payment/User actions ──emit──▶ EventBusService ──subscribe──▶ AnalyticsSubscriber (persist analytics_events)
Product.create      ──emit(PRODUCT_CREATED)──▶ SearchSubscriber ──▶ SearchIndexer.indexProduct (Meili)
Search performed    ──emit(SEARCH_PERFORMED)──▶ AnalyticsSubscriber
```

> Note: Because the `EventBus` is **in‑memory**, subscribers only run in the current process. Search writes are also done
> **synchronously inside `ProductsService`** (so the `PRODUCT_CREATED` subscriber is partly redundant), with the BullMQ
> worker as async fallback when direct Meilisearch write fails.

### 3.3 Request lifecycle (end‑to‑end, e.g. checkout)

```text
Browser ─▶ Next proxy (role guard for /admin)
  └▶ Next page/hook ─▶ Axios(api.ts) [+CSRF header, withCredentials]
      └▶ Nest: CSRF Middleware → ThrottlerGuard → JwtAuthGuard → RolesGuard → PermissionsGuard
          └▶ Controller → Service → (DatabaseTransactionService) → Repository → MongoDB
          └▶ side effects: EventBus → Analytics/Search subscribers; BullMQ job → (in-process) Worker → Meilisearch
          └▶ returns; tokens in httpOnly cookies; CSRF cookie refreshed on /auth/me
```

---

## 4. Data Model (MongoDB collections)

| Collection | Key fields | Indexes / notes |
| --- | --- | --- |
| `users` | email*, phoneNumber*, passwordHash(select:false), role, accountStatus, isEmailVerified, isPhoneVerified, twoFactor*, failedLoginAttempts, lockedUntil, tokenVersion, deletedAt | soft‑delete; email/phone unique |
| `refresh_tokens` | userId, tokenHash*, deviceId, sessionId, jti, tokenFamilyId, replacedByTokenId, reuseDetected, tokenVersion, expiresAt, revokedAt | `tokenHash` unique; TTL on `expiresAt`; family/device indexes |
| `sessions` | userId, deviceId, ip, ua, lastActiveAt, expiresAt, revokedAt, isTrusted | — |
| `otp_codes` | userId, target, codeHash, type, attempts, blockedUntil, verifiedAt, expiresAt | TTL‑backed lifecycle |
| `products` | name, description, price, discountPrice, stock, images[], categoryId, isActive, deletedAt | compound indexes (isActive+deletedAt, category+isActive+deletedAt) |
| `categories` | name, slug* | slug unique |
| `carts` | userId*, items[{productId, quantity}] | userId unique |
| `orders` | userId, items[{productId, quantity, priceAtPurchase}], totalPrice, status(FSM), deliveryAddress, deliveryWindow | (userId, createdAt), (status, createdAt) |
| `payments` | orderId, userId, amount, status, method, transactionId | partial unique on (orderId,status=PENDING); (status,createdAt) |
| `analytics_events` | userId, type(enum), metadata(Mixed), timestamp, sessionId, deviceId | (type,timestamp),(userId,timestamp),(metadata.*,type) |
| `audit_logs` | userId, action, ip, deviceId, ua, createdAt | — |
| `permissions` | name*, resource, action | **never read by the guard — orphaned** |

---

## 5. Risks, Production Gaps & Scalability Issues

### 5.1 🔴 Critical production gaps (must fix before go‑live)

1. **Payment is mock‑only.** `PaymentsService.simulatePaymentSuccess` fakes a gateway. No Zarinpal/Stripe integration, **no payment callback/webhook endpoint, no signature/IP verification, no `transactionId` reconciliation**. Real money flow requires a new callback route + gateway adapter (keep the abstraction layer).
2. **OTP delivery is unimplemented.** `OtpService.createOtpForTarget` logs the code to console and explicitly *skips* sending; `SmsIrService` and `MailWorker` are no‑ops (logging only). No user can actually receive an OTP. *(Email/SMS providers are stubbed.)*
3. **No outbox / durable events.** `EventBus` is in‑memory (Phase 1). If the process restarts or a subscriber throws mid‑flush, analytics/search updates are lost. Search consistency relies on synchronous writes; analytics can desync.
   - ✅ **Resolved (Phase 2):** added an `outbox` module — durable `outbox_events` collection, `OutboxService` (persist → dispatch → confirm), and `OutboxRelayWorker` (BullMQ repeatable sweep that replays any PENDING event past its grace window). `EventBusService` now persists durable events *before* dispatch and confirms on success; `SEARCH_PERFORMED` stays non‑durable (high‑frequency). Consumers are idempotent (`dedupeKey`, sparse‑unique on `analytics_events`). Tests: `event-bus.outbox.spec.ts`, `outbox.service.spec.ts` (both passing).
4. **No database seeding.** No seeder for initial `permissions`, `categories`, or a bootstrap admin user. Onboarding requires raw DB writes.
5. **Analytics double‑counting.** Both the backend `EventBus` subscribers (ORDER_CREATED, ORDER_PAID→PAYMENT_SUCCESS) **and** the frontend (`/analytics/event` from checkout/success pages) write these events → inflated funnel & revenue.
6. **Order creation is not idempotent.** Only payments use `IdempotencyService`. A retried `POST /orders` (or interrupted checkout) can double‑charge / create duplicate orders.

### 5.2 🟠 Scalability / performance risks

7. **Unpaginated list endpoints.** `GET /users`, `/orders`, `/admin/search` return unbounded result sets. Add cursor/offset pagination + indexes.
8. **Analytics dashboard runs heavy aggregations live.** `getDashboard()` fires ~6 aggregation pipelines per request with no caching; `countDistinctUsers` loads distinct user IDs into app memory. Cache dashboard results (Redis/TTL) and pre‑aggregate.
9. **Throttling is in‑memory.** `@nestjs/throttler` default storage isn't shared → rate limits don't hold across horizontally‑scaled instances. Use Redis storage adapter if scaling out.
10. **In‑process BullMQ workers.** `SearchWorker`/`MailWorker` run inside the API process. Horizontal API scaling → duplicate job processing (or resource contention). Plan a dedicated worker process / `BullMQ` worker separation.
11. **No read caching / search‑result caching.** Redis is used only for OTP lockout, cart lock, idempotency. Product listing & search results are not cached → DB/search pressure under load.
12. **Transaction fallback in non‑prod.** `DatabaseTransactionService` silently executes *without* a session when replica set is unavailable. Consistency is only guaranteed in production on a replica set / mongos — easy to misconfigure.

### 5.3 🟡 Architecture / code‑quality / consistency debt

13. **Permission system is partly static.** `PermissionsGuard` uses the hardcoded `ROLE_PERMISSIONS` constant; the `permissions` collection is never queried or seeded → RBAC is role‑static, not data‑driven (and contains `vendors.approve`, `VENDOR`/`DELIVERY` roles unused in a single‑vendor system → role bloat).
14. **Dead code:** `infrastructure/cache/redis.provider.ts` (`REDIS_CLIENT`, `redis` pkg) is unused — RedisService uses `ioredis`. Remove.
15. **Config drift:** `MEILI_HOST` / `MEILI_API_KEY` are consumed by the search module but **absent from `.env.example`**. Add them (plus Swagger path, throttler storage).
16. **Inconsistent Meilisearch client init:** `search.service.ts`, `search.indexer.ts`, `search.worker.ts` each `require('meilisearch')` interleaved with ESM imports and instantiate their own client (3 total). Consolidate into one injected client.
17. **`/health` is shallow** — doesn't verify Mongo, Redis, Meili, or BullMQ connectivity → weak liveness/readiness signal for orchestrators.
18. **Image storage is local disk**, not MinIO (despite docs listing MinIO). `multer` → `./uploads/product-images`. Needs object storage + cleanup + validation before production.
19. **Frontend dependency versions look atypical/unresolvable** (e.g. `lucide-react ^1.21.0`, `framer-motion ^12.40.0`, Next `16.2.9`). Since `npm install` has never succeeded (greenfield) and AGENT_RULES forbid version edits, **verify these resolve before install** — otherwise install/build will fail.
20. **External font import** (`fonts.googleapis.com` Vazirmatn) in `globals.css` — fine in production but won't load in sandboxed/preview iframes; prefer `next/font` self‑hosting.
21. **Stale docs:** `docs/PROJECT_STATE.md` references non‑existent `apps/frontend`/`apps/frontend-web` and understates search indexing (it *is* wired on create/update/delete + BullMQ + reindex script). Regenerate from `scripts/sync-project-state.js` after fixes.

### 5.4 ✅ Strengths to preserve (do not regress)

- Cookie‑based httpOnly tokens + CSRF double‑submit + origin checks.
- Refresh‑token rotation, family reuse‑detection, `tokenVersion` invalidation.
- Account lockout, bcrypt+pepper, audit logging that never blocks auth.
- Repository pattern + transactional order/payment/cart with price snapshots & stock restore.
- Global validation, helmet, CORS hardening, structured Winston logging, idempotent payments.
- Clean frontend data layer (Axios + retry queue + TanStack Query + Zustand + role‑guarded proxy).

---

## 6. Recommended (future) Work Streams — *for approval only (not yet implemented)*

1. **Payments v2:** gateway adapter interface + Zarinpal/Stripe, callback/webhook route, signature verification, idempotency, reconciliation.
2. **Notifications:** real SMS/email providers (Sms.ir / SMTP), templated OTP & transactional mail, wire into `OtpService`/`MailWorker`.
3. **Events:** durable outbox collection + relay workers → make analytics/search crash‑safe.
4. **Search:** managed Meili, index versioning, scheduled reindex, remove double `require()` clients.
5. **Ops hardening:** Redis throttler store, worker process separation, rich `/health`, pagination everywhere, analytics caching, env parity, seeding.
6. **Tests:** expand beyond current auth/cart‑order‑payment specs to services, guards, search, analytics, payments; add CI; pin/verify frontend deps so install succeeds.
7. **Permission model:** decide static‑vs‑DB; either seed & use the `permissions` collection or drop the unused schema/role surface.

---

*End of Phase‑1 analysis. No module was modified. Awaiting further instructions before any implementation.*
