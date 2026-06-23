# خلاصه کامل پروژه Hyper Market

## 1. هدف پروژه

پروژه **Hyper Market** یک پلتفرم فروشگاهی Enterprise مشابه Digikala / Snapp Market است.

هدف اصلی پروژه:

- ساخت یک سیستم فروشگاه آنلاین کامل
- پشتیبانی از احراز هویت امن
- مدیریت محصول، دسته‌بندی، سبد خرید، سفارش و پرداخت
- پنل ادمین فارسی و RTL
- جستجوی سریع با Meilisearch
- آنالیتیکس رفتاری و فروش
- معماری قابل توسعه برای آینده مثل:
  - Queue processing
  - Event-driven architecture
  - Kafka / Redis PubSub
  - Payment gateway واقعی
  - Vendor system
  - RBAC پیشرفته‌تر

---

## 2. معماری پروژه

پروژه به صورت monorepo با npm workspaces ساخته شده است.

```text
hyper-market/
  apps/
    backend-api/
    frontend/
    frontend-web/
  docs/
  packages/
```

پکیج‌منیجر:

```text
npm only
```

---

## 2.1 Backend Architecture

Backend با NestJS ساخته شده است.

Stack اصلی:

```text
NestJS
TypeScript
MongoDB
Mongoose
Redis
BullMQ
Meilisearch
JWT
Passport
Helmet
Winston
Swagger
```

معماری:

```text
Controller
  ↓
Service
  ↓
Repository
  ↓
Mongoose Model
  ↓
MongoDB
```

الگوی کلی:

```text
Modular Architecture
Repository Pattern
Service Layer
DTO Validation
Global Guards
Global Config
```

Runtime backend:

```text
Base URL: /api/v1
Health: /health
Versioning: URI-based versioning
```

Security runtime:

- Helmet
- CORS whitelist
- Global validation pipe
- Global exception filter
- Graceful shutdown hooks
- Env validation
- JWT auth guard
- Roles guard
- Permissions guard

---

## 2.2 Frontend Architecture

Frontend اصلی:

```text
apps/frontend
```

Stack:

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn-style components
Framer Motion
Zustand
TanStack Query
Axios
```

ویژگی‌ها:

- کاملاً فارسی
- کاملاً RTL
- Mobile-first
- UI شبیه فروشگاه‌های ایرانی
- پنل ادمین جداگانه
- اتصال به API واقعی بک‌اند
- مدیریت auth client-side
- React Query برای server state
- Zustand برای auth state

---

## 2.3 Database Architecture

Database اصلی:

```text
MongoDB
```

ODM:

```text
Mongoose
```

Collections مهم:

```text
users
otp_codes
refresh_tokens
sessions
products
categories
carts
orders
payments
audit_logs
analytics_events
permissions
```

Redis استفاده شده برای:

```text
OTP attempts
OTP lockout
Temporary runtime validation
BullMQ backend dependency
```

Meilisearch استفاده شده برای:

```text
Product search
Autocomplete
Admin product search
Filtering
Sorting
```

---

## 3. فیچرهای کامل شده

## 3.1 Auth & Security

کامل شده:

- JWT authentication
- Access token
- Refresh token
- Refresh token rotation
- Refresh token reuse detection
- Token family revocation
- Logout
- Logout graceful handling
- Current user decorator
- Public decorator
- Global JWT guard
- Roles guard
- Permissions guard
- RBAC پایه
- Fine-grained permissions
- Password hashing with bcrypt
- Password pepper
- Password policy
- Token hashing with SHA-256
- Account lockout
- Failed login attempts
- OTP verification
- OTP attempts
- OTP lockout
- Rate limiting with throttler
- Audit logging
- Token versioning
- Device/session tracking

---

## 3.2 OTP / Verification

کامل شده:

- Register with pending status
- Send verification OTP
- Verify email
- Verify phone
- Forgot password
- Reset password
- OTP Mongo persistence
- Redis attempts and lockout
- Development OTP mode

در development:

```text
NODE_ENV=development
OTP = 123456
```

در این حالت:

- OTP ارسال نمی‌شود
- کد ثابت `123456` است
- plain text ذخیره می‌شود تا تست راحت باشد

---

## 3.3 Product Module

کامل شده:

- Product schema
- Product repository
- Product service
- Product controller
- Create product
- Update product
- Delete product soft delete
- Get product by id
- List active products
- Pagination
- Category filter
- Stock field
- Discount price
- Images
- Admin-only create/update/delete
- Public product listing/detail

---

## 3.4 Category Module

کامل شده در بک‌اند:

- Category schema
- Category repository
- Category service
- Category module
- List categories endpoint

موجود:

```text
GET /categories
```

ناقص:

```text
POST /categories
PUT /categories/:id
DELETE /categories/:id
```

---

## 3.5 Cart Module

کامل شده:

- Cart schema
- Cart repository
- Cart service
- Cart controller
- Get my cart
- Add product
- Remove product
- Clear cart
- Calculate total
- Validate stock before adding
- Authenticated customer-only access

Endpoints:

```text
GET /cart/my
POST /cart/add
POST /cart/remove
POST /cart/clear
```

---

## 3.6 Order Module

کامل شده:

- Order schema
- Order repository
- Order service
- Order controller
- Create order from cart
- Reduce stock after order
- Clear cart after order
- Stock rollback on order failure
- My orders
- Admin order list
- Order detail
- Status transitions
- Admin update status

Endpoints:

```text
POST /orders
GET /orders/my
GET /orders/:id
GET /orders
PATCH /orders/:id/status
```

Order statuses:

```text
pending
paid
processing
shipped
delivered
cancelled
```

---

## 3.7 Payment Module

کامل شده:

- Payment schema
- Payment repository
- Payment service
- Payment controller
- Payment abstraction layer
- Mock payment
- Simulate payment success
- Idempotent pending payment handling
- Prevent double paid payment
- Update order status to paid

Endpoints:

```text
POST /payments/create
POST /payments/simulate-success
GET /payments/:orderId
```

Payment methods:

```text
mock
stripe
zarinpal
```

فعلاً فقط abstraction است و gateway واقعی هنوز پیاده نشده.

---

## 3.8 Search System

کامل شده:

- Meilisearch integration
- Search module
- Search service
- Search indexer
- Search controller
- Product indexing on:
  - create
  - update
  - delete
  - stock reduce
  - stock restore
- Public product search
- Admin product search
- Autocomplete suggestions
- Price filter
- Stock filter
- Category filter
- Sort
- Fuzzy / typo tolerant search
- Fix for filter injection vulnerability on `categoryId`

Endpoints:

```text
GET /search/products?q=
GET /search/suggest?q=
GET /admin/search/products?q=
```

---

## 3.9 Analytics System

کامل شده:

- Analytics module
- Event schema
- Event repository
- Analytics service
- Analytics controller
- Raw event storage
- Aggregation on demand
- Revenue metrics
- Product metrics
- Search metrics
- Funnel metrics
- Admin analytics dashboard

Events:

```text
PRODUCT_VIEW
PRODUCT_CLICK
ADD_TO_CART
REMOVE_FROM_CART
CHECKOUT_START
ORDER_CREATED
PAYMENT_SUCCESS
SEARCH_QUERY
LOGIN
REGISTER
```

Endpoints:

```text
POST /analytics/event
GET /analytics/dashboard
GET /analytics/revenue
GET /analytics/products
GET /analytics/search
GET /analytics/funnel
```

---

## 3.10 Audit Logging

کامل شده:

- Audit module
- Audit log schema
- Audit repository
- Security event logging

Audit actions:

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
TOKEN_REFRESH
OTP_VERIFIED
PASSWORD_CHANGED
ACCOUNT_LOCKED
```

---

## 3.11 Permissions System

کامل شده:

- Permission schema
- Permission repository
- Permissions decorator
- Permissions guard
- Role-permission mapping

Examples:

```text
products.create
products.update
products.delete
orders.cancel
users.ban
vendors.approve
```

Guard order:

```text
JwtAuthGuard
RolesGuard
PermissionsGuard
```

---

## 3.12 Event Bus Phase 1

کامل شده:

- In-memory Event Bus
- EventType enum
- BaseEvent interface
- EventBusService
- EventBusModule

مسیر:

```text
apps/backend-api/src/core/events
```

هدف:

- آماده‌سازی برای decoupling
- آینده BullMQ / Kafka / Redis PubSub
- هنوز در business flowها کامل جایگزین نشده

---

## 3.13 Queue System

کامل شده:

- BullMQ queue service
- Queue module
- createJob()
- retry 3 times
- remove completed jobs

---

## 3.14 Mail System

کامل شده به صورت abstraction:

- Mail module
- Mail service
- sendOtpEmail()
- sendPasswordResetEmail()
- SMTP ندارد
- فقط queue job می‌سازد

---

## 3.15 Redis Infrastructure

کامل شده:

- Redis service with ioredis
- Cache module
- get
- set
- delete
- exists
- JSON serialization
- lifecycle handling
- reconnect strategy

---

## 3.16 Database Transaction Layer

کامل شده:

- DatabaseTransactionService
- Mongoose session wrapper
- executeInTransaction()
- commit on success
- rollback on failure
- cleanup in finally

هنوز در همه business flowهای حساس استفاده نشده.

---

## 3.17 Production Runtime

کامل شده:

- Env validation
- DATABASE_URL
- REDIS_URL
- JWT secrets
- PASSWORD_PEPPER
- CORS_ORIGINS
- Helmet
- CORS whitelist
- Global prefix `/api/v1`
- Health endpoint
- Graceful shutdown
- Logger hardening
- Mongo retry

---

## 3.18 Frontend Customer UI

کامل شده:

- Fully Persian
- Fully RTL
- Home
- Login
- Register
- Verify OTP
- Products
- Product detail
- Search page
- Cart
- Checkout
- Order success
- Orders
- Profile
- Protected routes
- Auth state
- Silent refresh token handling
- Axios interceptor
- Cart React Query sync
- Product search UX
- Header autocomplete

---

## 3.19 Frontend Admin Panel

کامل شده:

- Admin layout
- Sidebar
- Admin route protection
- Role check admin/super_admin
- Dashboard
- Products
- Product create
- Product edit
- Product delete
- Category list
- Orders
- Order detail
- Payments
- Users UI
- Analytics dashboard
- Persian RTL admin panel

Routes:

```text
/admin
/admin/products
/admin/products/new
/admin/products/[id]
/admin/categories
/admin/orders
/admin/orders/[id]
/admin/payments
/admin/users
/admin/analytics
```

---

## 4. فیچرهای در حال انجام / نیمه‌کامل

## 4.1 Category CRUD

وضعیت:

- List category کامل است.
- Create/update/delete category در backend endpoint ندارد.
- Frontend admin category page فقط list واقعی دارد.
- فرم create/edit/delete غیرفعال است و پیام مناسب نمایش می‌دهد.

نیاز دارد:

```text
POST /categories
PUT /categories/:id
DELETE /categories/:id
```

---

## 4.2 User Management

وضعیت:

- UI در admin وجود دارد.
- Backend endpoint واقعی برای `GET /users` ممکن است کامل expose نشده باشد.
- Block/unblock فقط UI است.

نیاز دارد:

```text
GET /users
GET /users/:id
PATCH /users/:id/block
PATCH /users/:id/unblock
```

---

## 4.3 Mail System

وضعیت:

- Queue abstraction دارد.
- SMTP/provider واقعی ندارد.

نیاز دارد:

- SMTP
- SES
- Mailgun
- SMS provider
- Kavenegar / Ghasedak / etc.

---

## 4.4 Payment Gateway

وضعیت:

- Mock payment دارد.
- Stripe / Zarinpal فقط enum هستند.
- Real gateway integration انجام نشده.

نیاز دارد:

- Zarinpal request
- Zarinpal verify
- Callback URL
- Payment authority/refId
- Gateway logs

---

## 4.5 Event Bus

وضعیت:

- EventBus core آماده است.
- هنوز business modules کامل به event-driven تبدیل نشده‌اند.

نیاز دارد:

- Subscribers
- Analytics subscriber
- Mail subscriber
- Search indexing subscriber
- Order events
- Product events

---

## 4.6 Database Transactions

وضعیت:

- Transaction service آماده است.
- همه flowهای حساس هنوز transaction-based نشده‌اند.

نیاز دارد:

- Order creation transaction
- Payment status update transaction
- Cart clearing transaction
- Stock update transaction

---

## 5. TODO ها

## 5.1 Backend TODO

### Category

```text
POST /categories
PUT /categories/:id
DELETE /categories/:id
GET /categories/:id
```

### Users Admin

```text
GET /users
GET /users/:id
PATCH /users/:id/block
PATCH /users/:id/unblock
```

### Payment

```text
Zarinpal integration
Payment callback
Verify payment real flow
Payment failure handling
Refund abstraction
```

### Event Bus

```text
Replace direct analytics calls with events
Replace direct mail calls with events
Replace direct search index calls with events
Add subscribers
Prepare BullMQ bridge
```

### Order

```text
Use Mongo transaction for:
- stock reduce
- order create
- cart clear
```

### Cart

```text
Better product details in cart response
Cart item product population
Quantity increment/decrement endpoint
```

### Search

```text
Initial bulk indexing command
Reindex all products script
Search analytics integration with EventBus
Popular searches
Trending products
```

### Analytics

```text
Admin charts with real time ranges
Date filters
Export reports
User cohorts
Retention metrics
```

### Mail/SMS

```text
SMS provider integration
Email provider integration
Templates
Retry workers
Dead letter queue
```

### Security

```text
CSRF strategy if cookies introduced
Refresh token storage hardening
Device management UI
Session revoke UI
```

---

## 5.2 Frontend TODO

### Admin Category

```text
Enable create/edit/delete after backend endpoints exist
```

### Admin Users

```text
Connect to real user APIs
Enable block/unblock
User detail page
```

### Cart

```text
Show product name/image in cart
Quantity increment/decrement controls
```

### Products

```text
Image upload UI
Product image gallery
Better category pages
```

### Checkout

```text
Address form
Delivery time selection
Real payment redirect
```

### Analytics

```text
Better charts
Date range selector
CSV export
```

### UX

```text
Toast notifications
Loading skeletons
Empty states
Better error banners
```

---

## 6. ساختار فولدرها

## 6.1 Root

```text
hyper-market/
  apps/
    backend-api/
    frontend/
    frontend-web/
  docs/
  packages/
  package.json
  package-lock.json
```

---

## 6.2 Backend

```text
apps/backend-api/src/
  app.module.ts
  main.ts

  config/
    database/
    env/
    jwt/
    redis/
    swagger/

  core/
    events/
      enums/
      interfaces/
      event-bus.module.ts
      event-bus.service.ts
    exceptions/
    filters/

  infrastructure/
    cache/
    database/
    health/
    logger/
    security/

  modules/
    analytics/
    audit/
    auth/
    cart/
    categories/
    mail/
    orders/
    payments/
    permissions/
    products/
    queue/
    search/
    users/

  shared/
    interfaces/
    utils/
    validators/
```

---

## 6.3 Frontend

```text
apps/frontend/src/
  app/
    admin/
      analytics/
      categories/
      orders/
      payments/
      products/
      users/
    cart/
    checkout/
    login/
    order/
    orders/
    products/
    profile/
    register/
    search/
    verify-otp/

  components/
    admin/
    layout/
    ui/

  features/
    admin/

  hooks/

  lib/

  services/

  store/

  types/
```

---

## 7. تصمیم‌های مهم گرفته‌شده

### Package Manager

فقط:

```text
npm
```

نه pnpm، نه yarn.

---

### Monorepo

ساختار دستی npm workspaces:

```text
apps/*
packages/*
```

NestJS monorepo mode استفاده نشده.

---

### Backend Framework

انتخاب:

```text
NestJS
```

با:

```text
Modular Architecture
Repository Pattern
```

---

### Database

انتخاب:

```text
MongoDB + Mongoose
```

MongoDB منبع اصلی داده است.

---

### Cache / Runtime State

انتخاب:

```text
Redis
```

استفاده محدود:

```text
OTP attempts
OTP lockout
Temporary runtime validation
BullMQ dependency
```

---

### Search

انتخاب:

```text
Meilisearch
```

MongoDB جایگزین نشده؛ فقط search index layer است.

---

### Auth

انتخاب:

```text
OTP + JWT + Refresh Token
```

Access token کوتاه‌مدت:

```text
15m
```

Refresh token بلندمدت:

```text
30d
```

---

### Token Storage Frontend

در frontend:

```text
sessionStorage
```

برای:

```text
accessToken
refreshToken
user
```

Refresh token silent refresh اضافه شده.

---

### OTP Development Mode

در development:

```text
NODE_ENV=development
OTP = 123456
```

برای تست بدون SMS provider.

---\n
### Phone Number Format

فرمت شماره موبایل در بک‌اند به ایران تغییر کرده است:

```text
09XXXXXXXXX
```

یعنی دقیقاً ۱۱ رقم و شروع با `09`.

---

### Persian / RTL

Frontend اصلی کاملاً:

```text
فارسی
RTL
mobile-first
```

---

### Admin Panel

پنل ادمین جدا از UI مشتری:

```text
/admin/*
```

فقط برای:

```text
admin
super_admin
```

---

### Payment

فعلاً:

```text
Mock payment abstraction
```

اما enum برای آینده:

```text
mock
stripe
zarinpal
```

---

### Event Architecture

EventBus in-memory اضافه شده برای آماده‌سازی:

```text
Event-driven side effects
```

ولی هنوز کل سیستم به event-driven مهاجرت نکرده.

---

### Analytics

تصمیم:

```text
Raw events in MongoDB
Aggregation on demand
```

نه data warehouse فعلاً.

---

### Production Readiness

اضافه شده:

```text
Helmet
CORS whitelist
Env validation
Graceful shutdown
Health check
Logger hardening
Mongo retry
Redis lifecycle
```

---

## وضعیت کلی پروژه

پروژه الان یک پایه Enterprise کامل دارد:

```text
Auth ✅
Security ✅
Products ✅
Cart ✅
Orders ✅
Payments mock ✅
Search ✅
Analytics ✅
Admin panel ✅
Persian RTL frontend ✅
Runtime readiness ✅
```

اما برای production واقعی هنوز این موارد مهم باقی مانده‌اند:

```text
Real category CRUD
Real user admin APIs
Real payment gateway
SMS/email provider
Transaction usage in critical flows
EventBus subscribers
Production deployment config
Testing suite
```
