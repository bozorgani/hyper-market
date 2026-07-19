# PROJECT STATE — Hyper Market

> This file is the single source of truth for the current real codebase state.
> Last generated from code inspection in this repository.

---

## 1. Project Overview

Hyper Market is an enterprise e-commerce monorepo inspired by Digikala / Snapp Market.

The repository is a full-stack npm-workspaces monorepo containing:

```text
apps/backend-api      NestJS API
apps/frontend         Main Next.js frontend: customer UI + Persian RTL admin panel
apps/frontend-web     Secondary independent Next.js frontend
packages/             Workspace placeholder for future shared packages
```

Main product goal:

- secure authentication with OTP + JWT + refresh tokens
- product and category catalog
- cart, order, and mock payment flow
- admin dashboard
- Meilisearch-based product search
- analytics event tracking and dashboard
- infrastructure for Redis, BullMQ, mail queue, transactions, audit logs, and in-memory event bus

Package manager:

```text
npm only
```

---

## 2. Backend Status (real implemented modules)

Backend app path:

```text
apps/backend-api
```

Detected backend dependencies:

```text
@nestjs/common
@nestjs/config
@nestjs/core
@nestjs/jwt
@nestjs/mongoose
@nestjs/passport
@nestjs/platform-express
@nestjs/swagger
@nestjs/throttler
bcrypt
bullmq
class-transformer
class-validator
dompurify
helmet
ioredis
jsdom
meilisearch
mongoose
nodemailer
passport
passport-jwt
reflect-metadata
rxjs
swagger-ui-express
winston
```

Runtime characteristics detected in code:

- Global API prefix: `/api/v1`
- Health endpoint exists at `/health`
- URI versioning is enabled
- Helmet is enabled
- CORS is configured from `CORS_ORIGINS`
- Global validation pipe is enabled
- Global exception filter is enabled
- Shutdown hooks are enabled
- ConfigModule validation is enabled

Implemented module directories:

```text
addresses
analytics
audit
auth
cart
categories
coupons
mail
orders
outbox
payments
permissions
products
queue
reviews
search
shipping
users
wishlist
```

Module implementation matrix:

| Module | Module file | Controllers | Services | Repositories | Schemas | DTOs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| addresses | yes | 1 | 1 | 1 | 1 | 1 |
| analytics | yes | 1 | 1 | 1 | 1 | 1 |
| audit | yes | 0 | 1 | 1 | 1 | 0 |
| auth | yes | 1 | 4 | 3 | 3 | 10 |
| cart | yes | 1 | 1 | 1 | 1 | 2 |
| categories | yes | 1 | 1 | 1 | 1 | 2 |
| coupons | yes | 1 | 1 | 1 | 2 | 2 |
| mail | yes | 0 | 3 | 0 | 0 | 0 |
| orders | yes | 1 | 1 | 1 | 1 | 2 |
| outbox | yes | 0 | 1 | 1 | 1 | 0 |
| payments | yes | 1 | 1 | 1 | 1 | 2 |
| permissions | yes | 1 | 1 | 1 | 1 | 1 |
| products | yes | 1 | 2 | 1 | 1 | 2 |
| queue | yes | 0 | 1 | 0 | 0 | 0 |
| reviews | no | 1 | 2 | 1 | 2 | 0 |
| search | yes | 1 | 2 | 0 | 0 | 0 |
| shipping | yes | 1 | 1 | 0 | 0 | 1 |
| users | yes | 1 | 1 | 1 | 1 | 0 |
| wishlist | yes | 1 | 1 | 1 | 1 | 0 |

Infrastructure/core detected:

- `core/events`: in-memory EventBus Phase 1
- `infrastructure/cache`: Redis service/cache module
- `infrastructure/database`: DatabaseTransactionService
- `infrastructure/health`: HealthController
- `infrastructure/logger`: Winston logger service/config
- `infrastructure/security`: password, token, and token-hash services
- `shared/utils/entity-id.util.ts`: shared entity id extraction utility

## 3. Frontend Status (frontend + frontend-web)

## 3.1 Main frontend: `apps/web`

Detected dependencies:

```text
@tanstack/react-query
@types/leaflet
axios
clsx
date-fns
framer-motion
leaflet
lucide-react
next
react
react-dom
tailwind-merge
tw-animate-css
zod
zustand
```

Detected App Router routes:

```text
/(main)
/(main)/cart
/(main)/categories
/(main)/checkout
/(main)/order/success
/(main)/orders
/(main)/orders/[id]/tracking
/(main)/products
/(main)/products/[id]
/(main)/profile
/(main)/profile/addresses
/(main)/search
/(main)/wishlist
/admin
/admin/analytics
/admin/categories
/admin/coupons
/admin/orders
/admin/orders/[id]
/admin/payments
/admin/products
/admin/products/[id]
/admin/products/new
/admin/roles
/admin/users
/forgot-password
/login
/register
/verify-otp
```

Detected characteristics from code:

- Next.js App Router application
- Persian/RTL UI is configured globally
- Zustand auth store exists
- Axios API service exists
- TanStack Query hooks are used for server state
- Customer-facing pages exist for auth, products, search, cart, checkout, orders, and profile
- Admin panel exists under `/admin/*`

## 3.2 Secondary frontend: `apps/web`

Detected dependencies:

```text
@tanstack/react-query
@types/leaflet
axios
clsx
date-fns
framer-motion
leaflet
lucide-react
next
react
react-dom
tailwind-merge
tw-animate-css
zod
zustand
```

Detected App Router routes:

```text
/(main)
/(main)/cart
/(main)/categories
/(main)/checkout
/(main)/order/success
/(main)/orders
/(main)/orders/[id]/tracking
/(main)/products
/(main)/products/[id]
/(main)/profile
/(main)/profile/addresses
/(main)/search
/(main)/wishlist
/admin
/admin/analytics
/admin/categories
/admin/coupons
/admin/orders
/admin/orders/[id]
/admin/payments
/admin/products
/admin/products/[id]
/admin/products/new
/admin/roles
/admin/users
/forgot-password
/login
/register
/verify-otp
```

Detected characteristics from code:

- Independent Next.js App Router application
- Contains auth-oriented routes and a dashboard route
- Uses its own local app/lib structure

## 4. API Status (implemented endpoints)

Global API prefix in code:

```text
/api/v1
```

Health endpoint is excluded from the global prefix:

```text
GET /health
```

Detected controller endpoints:

### apps/backend-api/src/modules/addresses/controllers/address.controller.ts

```text
POST   /addresses    [Roles(UserRole.CUSTOMER)]
DELETE /addresses/:id    [Roles(UserRole.CUSTOMER)]
PUT    /addresses/:id    [Roles(UserRole.CUSTOMER)]
PATCH  /addresses/:id/default    [Roles(UserRole.CUSTOMER)]
GET    /addresses/my    [Roles(UserRole.CUSTOMER)]
```

### apps/backend-api/src/modules/categories/controllers/categories.controller.ts

```text
GET    /admin/categories    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('categories.read')]
POST   /admin/categories    [Permissions('categories.create')]
DELETE /admin/categories/:id    [Permissions('categories.delete')]
GET    /admin/categories/:id    [Permissions('categories.read')]
PUT    /admin/categories/:id    [Permissions('categories.update')]
GET    /categories    [Public()]
GET    /categories/:id    [Public()]
```

### apps/backend-api/src/modules/coupons/coupons.controller.ts

```text
GET    /admin/coupons    [Roles(UserRole.CUSTOMER), Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('coupons.read')]
POST   /admin/coupons    [Roles(UserRole.CUSTOMER), Permissions('coupons.create')]
DELETE /admin/coupons/:id    [Roles(UserRole.CUSTOMER), Permissions('coupons.delete')]
GET    /admin/coupons/:id    [Roles(UserRole.CUSTOMER), Permissions('coupons.read')]
PUT    /admin/coupons/:id    [Roles(UserRole.CUSTOMER), Permissions('coupons.update')]
GET    /admin/coupons/analytics    [Roles(UserRole.CUSTOMER), Permissions('coupons.read')]
GET    /coupons/available    [Roles(UserRole.CUSTOMER)]
POST   /coupons/validate    [Roles(UserRole.CUSTOMER)]
```

### apps/backend-api/src/modules/products/controllers/products.controller.ts

```text
GET    /admin/products    [Permissions('products.read')]
POST   /admin/products    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('products.create')]
DELETE /admin/products/:id    [Permissions('products.delete')]
GET    /admin/products/:id    [Permissions('products.read')]
PUT    /admin/products/:id    [Permissions('products.update')]
POST   /admin/products/images/upload    [Permissions('products.update')]
GET    /products    [Public()]
GET    /products/:id    [Public()]
GET    /products/images/:fileName    [Public()]
```

### apps/backend-api/src/modules/reviews/review.controller.ts

```text
DELETE /admin/reviews/:id
POST   /admin/reviews/:id/approve
POST   /admin/reviews/:id/reject
GET    /admin/reviews/pending    [Roles(UserRole.ADMIN)]
POST   /reviews
DELETE /reviews/:id
PUT    /reviews/:id
POST   /reviews/:id/helpful
POST   /reviews/images/upload
GET    /reviews/my-reviews
GET    /reviews/product/:productId
GET    /reviews/product/:productId/stats
```

### apps/backend-api/src/modules/search/search.controller.ts

```text
GET    /admin/search/products    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
POST   /admin/search/reindex    [Roles(UserRole.SUPER_ADMIN)]
GET    /search/products    [Public()]
GET    /search/suggest    [Public()]
```

### apps/backend-api/src/modules/analytics/analytics.controller.ts

```text
GET    /analytics/dashboard    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
POST   /analytics/event    [Public()]
GET    /analytics/funnel    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
GET    /analytics/products    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
GET    /analytics/revenue    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
GET    /analytics/search    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
```

### apps/backend-api/src/modules/auth/controllers/auth.controller.ts

```text
GET    /auth/csrf-token    [Public()]
POST   /auth/forgot-password    [Public()]
POST   /auth/login    [Public()]
POST   /auth/logout    [Public()]
GET    /auth/me
POST   /auth/refresh    [Public()]
POST   /auth/register    [Public()]
POST   /auth/reset-password    [Public()]
POST   /auth/send-verification-otp    [Public()]
POST   /auth/verify-email    [Public()]
POST   /auth/verify-otp    [Public()]
POST   /auth/verify-phone    [Public()]
```

### apps/backend-api/src/modules/cart/controllers/cart.controller.ts

```text
POST   /cart/add    [Roles(UserRole.CUSTOMER)]
POST   /cart/clear    [Roles(UserRole.CUSTOMER)]
GET    /cart/my    [Roles(UserRole.CUSTOMER)]
POST   /cart/remove    [Roles(UserRole.CUSTOMER)]
POST   /cart/update    [Roles(UserRole.CUSTOMER)]
```

### apps/backend-api/src/infrastructure/health/health.controller.ts

```text
GET    /health    [Public()]
GET    /health/live    [Public()]
GET    /health/ready    [Public()]
```

### apps/backend-api/src/infrastructure/observability/observability.controller.ts

```text
GET    /metrics    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
GET    /observability/dashboard    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
```

### apps/backend-api/src/modules/orders/controllers/orders.controller.ts

```text
GET    /orders    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('orders.read')]
POST   /orders    [Roles(UserRole.CUSTOMER)]
GET    /orders/:id
PATCH  /orders/:id/status    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)]
GET    /orders/my    [Roles(UserRole.CUSTOMER)]
```

### apps/backend-api/src/modules/payments/controllers/payments.controller.ts

```text
GET    /payments/:orderId
GET    /payments/admin    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('payments.read')]
GET    /payments/batch
POST   /payments/create
```

### apps/backend-api/src/modules/permissions/controllers/permissions.controller.ts

```text
GET    /permissions    [Roles(UserRole.SUPER_ADMIN), Permissions('permissions.read')]
GET    /permissions/:role    [Roles(UserRole.SUPER_ADMIN), Permissions('permissions.read')]
POST   /permissions/grant    [Roles(UserRole.SUPER_ADMIN), Permissions('permissions.update')]
POST   /permissions/revoke    [Roles(UserRole.SUPER_ADMIN), Permissions('permissions.update')]
POST   /permissions/seed    [Roles(UserRole.SUPER_ADMIN), Permissions('permissions.update')]
```

### apps/backend-api/src/modules/shipping/shipping.controller.ts

```text
POST   /shipping/quote    [Roles(UserRole.CUSTOMER)]
```

### apps/backend-api/src/modules/users/controllers/users.controller.ts

```text
GET    /users    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('users.read')]
GET    /users/:id    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('users.read')]
PATCH  /users/:id/block    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('users.ban')]
PATCH  /users/:id/unblock    [Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN), Permissions('users.ban')]
```

### apps/backend-api/src/modules/wishlist/wishlist.controller.ts

```text
GET    /wishlist
POST   /wishlist/add
GET    /wishlist/check/:productId
DELETE /wishlist/clear
GET    /wishlist/count
DELETE /wishlist/remove
POST   /wishlist/toggle
```

## 5. Database Schema Overview

### User

Collection:

```text
users
```

Important fields:

```text
email
phoneNumber
passwordHash
role
accountStatus
isEmailVerified
isPhoneVerified
twoFactorEnabled
twoFactorMethod
failedLoginAttempts
lockedUntil
lastFailedLoginAt
lastLoginAt
passwordChangedAt
tokenVersion
deletedAt
```

Phone format validation:

```text
/^09\d{9}$/
```

### RefreshToken

Collection:

```text
refresh_tokens
```

Fields:

```text
userId
tokenHash
deviceId
sessionId
jti
tokenFamilyId
replacedByTokenId
reuseDetected
tokenVersion
expiresAt
revokedAt
```

Indexes include token family, token hash unique, user/device/revoked, and TTL on expiresAt.

### Session

Collection:

```text
sessions
```

Fields:

```text
userId
deviceId
ipAddress
userAgent
lastActiveAt
expiresAt
revokedAt
isTrusted
```

### OtpCode

Collection:

```text
otp_codes
```

Fields:

```text
userId
target
codeHash
type
expiresAt
attempts
blockedUntil
verifiedAt
```

### Product

Collection:

```text
products
```

Fields:

```text
name
description
price
discountPrice
stock
images
categoryId
isActive
deletedAt
```

### Category

Collection:

```text
categories
```

Fields:

```text
name
slug
```

Unique index on slug.

### Cart

Collection:

```text
carts
```

Fields:

```text
userId
items[]:
  productId
  quantity
```

Unique index on userId.

### Order

Collection:

```text
orders
```

Fields:

```text
userId
items[]:
  productId
  quantity
  priceAtPurchase
totalPrice
status
```

### Payment

Collection:

```text
payments
```

Fields:

```text
orderId
userId
amount
status
method
transactionId
```

### AnalyticsEvent

Collection:

```text
analytics_events
```

Fields:

```text
userId
type
metadata
timestamp
sessionId
deviceId
```

### AuditLog

Collection:

```text
audit_logs
```

Fields:

```text
userId
action
ipAddress
deviceId
userAgent
createdAt
```

### Permission

Collection:

```text
permissions
```

Fields:

```text
name
resource
action
```

---

## 6. Completed Features

- Backend API application exists under `apps/backend-api`.
- Main frontend application exists under `apps/web`.
- Secondary frontend application exists under `apps/web`.
- Auth module exists with JWT/OTP-related services, guards, strategies, DTOs, and schemas.
- Products module exists with controller, service, repository, DTOs, and schema.
- Categories module exists with list controller, service, repository, and schema.
- Cart module exists with controller, service, repository, DTOs, and schema.
- Orders module exists with controller, service, repository, DTOs, enum, and schema.
- Payments module exists with mock/abstraction controller, service, repository, DTOs, enums, and schema.
- Search module exists with Meilisearch service, indexer, and controllers.
- Analytics module exists with raw event storage and aggregation endpoints.
- Queue module exists with BullMQ QueueService.
- Mail module exists as queue-based abstraction.
- Permissions module exists with decorator, guard, schema, repository, and role-permission mapping.
- In-memory EventBus Phase 1 exists.
- Mongoose transaction wrapper service exists.
- Redis service exists.

## 7. Missing / Broken Features

- Category create API is missing: `POST /categories`.
- Category update API is missing: `PUT /categories/:id`.
- Category delete API is missing: `DELETE /categories/:id`.

## 8. High Priority TODOs

- Category create API is missing: `POST /categories`
- Category update API is missing: `PUT /categories/:id`
- Category delete API is missing: `DELETE /categories/:id`
- Add transaction usage to critical order/payment/cart flows if not already applied.
- Add tests for auth, permissions, cart/order/payment, search, and analytics flows.

## 9. Architecture Decisions (from existing docs)

Existing docs inspected:

```text
docs/auth-domain-design.md
docs/final-stack-decision.md
docs/phase-1-prd.md
docs/phase-2-database-design.md
docs/phase-3-backend-architecture.md
docs/phase-4-api-contract.md
docs/phase-5-monorepo.md
```

Documented decisions:

### Backend

```text
NestJS
MongoDB
Mongoose
Redis
BullMQ
Swagger
Winston
```

### Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Framer Motion
Zustand
TanStack Query
```

### Search

```text
Meilisearch
```

### Storage

```text
MinIO temporary
```

No MinIO implementation was found in current code.

### Authentication

```text
OTP + JWT + Refresh Token
```

### Payment

```text
Zarinpal abstraction layer
```

Current code has payment abstraction and method enum but no real Zarinpal integration.

### Monorepo

```text
npm workspaces
npm only
```

### Backend architecture

```text
Modular Architecture
Repository Pattern
Controller → Service → Repository → Mongoose Model → MongoDB
```

Rules from docs:

- Controllers never access DB directly
- Services contain business logic
- Repositories handle database access

---

## 10. Risks / Technical Debt

- Admin product creation depends on pre-existing categories, but admin category CRUD is not available through API.
- Meilisearch index can become stale because no bulk reindex command was detected.
- Permission model is partly static in code even though permission schema exists.
- No comprehensive automated test suite was detected by this script.

