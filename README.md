# Hyper Market

Hyper Market یک پلتفرم فروشگاهی Monorepo با Backend مبتنی بر NestJS و Frontend مبتنی بر Next.js App Router است. پروژه شامل احراز هویت، سبد خرید، سفارش، پرداخت در محل، کوپن، ارسال، جستجو، پنل مدیریت، audit log، observability، Docker، CI و تست‌های E2E است.

---

## وضعیت فعلی

- Backend فعال و ماژولار با NestJS
- Frontend فعال با Next.js 16 App Router
- صفحات public اصلی با Server Components و SSR/metadata پویا
- CI با GitHub Actions
- Docker و Docker Compose برای full stack و infra-only
- MongoDB replica set، Redis و Meilisearch
- Unit Test و E2E زیرساختی
- Frontend E2E با Playwright
- Security hardening شامل CSRF، Helmet، CSP report-only، JWT rotation و upload validation

---

## ساختار Monorepo

```text
hyper-market/
├── apps/
│   ├── backend-api/        # NestJS API
│   └── web/                # Next.js frontend
├── docs/                   # مستندات عملیاتی و فنی
├── scripts/                # seed/reindex/helper scripts
├── docker-compose.yml      # اجرای کل stack
├── docker-compose.infra.yml# فقط دیتابیس‌ها/زیرساخت برای dev محلی
├── docker-compose.test.yml # زیرساخت E2E
└── package.json            # npm workspaces
```

---

## تکنولوژی‌ها

### Backend

- NestJS 11
- MongoDB / Mongoose
- Redis / ioredis
- BullMQ workers
- Meilisearch
- JWT + Refresh Token Rotation
- RBAC + Dynamic Permissions
- CSRF double-submit
- Outbox/Event Bus
- Audit logs
- Prometheus-style metrics

### Frontend

- Next.js 16 App Router
- React 19
- TanStack Query
- Zustand
- Tailwind CSS 4
- Playwright
- RTL Persian UI

---

## پیش‌نیازها

```text
Node.js >= 20
npm >= 10
Docker + Docker Compose
```

نصب وابستگی‌ها:

```bash
npm ci
```

---

## اجرای توسعه روزانه پیشنهادی

برای توسعه راحت‌تر، بهتر است دیتابیس‌ها داخل Docker باشند و Backend/Frontend را روی سیستم خودتان اجرا کنید تا لاگ‌ها مستقیم دیده شوند.

### 1. اجرای زیرساخت‌ها

```bash
docker compose -f docker-compose.infra.yml up -d
```

این سرویس‌ها اجرا می‌شوند:

- MongoDB replica set
- Redis
- Meilisearch

لاگ زیرساخت‌ها:

```bash
docker compose -f docker-compose.infra.yml logs -f
```

توقف:

```bash
docker compose -f docker-compose.infra.yml down
```

---

### 2. تنظیم Backend env

از فایل نمونه استفاده کنید:

```bash
cp apps/backend-api/.env.example apps/backend-api/.env
```

برای اجرای همزمان frontend روی `3000`، بهتر است backend را روی `3001` اجرا کنید:

```env
PORT=3001
DATABASE_URL=mongodb://localhost:27017/hyper_market?replicaSet=rs0
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
MEILI_HOST=http://localhost:7700
MEILI_API_KEY=hyper_market_meili_master_key_change_me
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PUBLIC_API_BASE_URL=http://localhost:3001
WORKERS_ENABLED=true
```

برای production مقدارهای secret زیر را حتماً تغییر دهید:

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
PASSWORD_PEPPER=
OTP_HASH_SECRET=
MEILI_API_KEY=
```

---

### 3. اجرای Backend

```bash
npm run backend:dev
```

API:

```text
http://localhost:3001
```

Health:

```bash
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
```

Swagger در صورت فعال‌سازی:

```env
SWAGGER_ENABLED=true
```

```text
http://localhost:3001/api/docs
```

---

### 4. اجرای Frontend

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1 npm run dev --workspace=apps/web
```

Frontend:

```text
http://localhost:3000
```

---

## اجرای کامل با Docker

برای اجرای کل stack داخل Docker:

```bash
docker compose up --build
```

سرویس‌ها:

| سرویس | آدرس |
|---|---|
| Web | `http://localhost:3000` |
| Backend | `http://localhost:3001` |
| Meilisearch | `http://localhost:7700` |
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |

توقف و حذف volumeها:

```bash
docker compose down -v
```

مستندات بیشتر:

```text
docs/docker.md
docs/local-dev-with-docker-infra.md
```

---

## اسکریپت‌های مهم

```bash
# Backend
npm run backend:dev
npm run backend:build
npm run backend:test

# Frontend
npm run dev --workspace=apps/web
npm run build --workspace=apps/web
npm run lint --workspace=apps/web

# E2E infra
npm run e2e:infra:up
npm run backend:test:e2e
npm run e2e:infra:down

# Frontend E2E
npm run web:e2e
npm run web:e2e:headed

# Seed
npm run seed:permissions
npm run seed:admin
npm run seed:products
npm run seed:all

# Search
npm run search:reindex
```

---

## تست‌ها

### Backend unit tests

```bash
npm run backend:test -- --runInBand
```

### Backend E2E

```bash
npm run e2e:infra:up
npm run backend:test:e2e
npm run e2e:infra:down
```

مستندات:

```text
docs/e2e.md
```

### Frontend E2E

```bash
npx playwright install --with-deps chromium
npm run web:e2e
```

---

## CI/CD

GitHub Actions در مسیر زیر قرار دارد:

```text
.github/workflows/ci.yml
```

Jobها:

- install
- npm audit
- backend build/test
- frontend lint/build
- backend E2E
- frontend E2E Playwright

---

## قابلیت‌های اصلی

### Customer

- ثبت‌نام و ورود
- تأیید OTP
- سبد خرید
- سفارش
- پرداخت در محل
- کوپن تخفیف backend-driven
- هزینه ارسال و روش ارسال
- آدرس‌های ذخیره‌شده و آدرس پیش‌فرض
- مشاهده سفارش‌ها

### Admin

- مدیریت محصولات
- مدیریت دسته‌بندی‌ها
- مدیریت کاربران
- مدیریت سفارش‌ها
- مدیریت پرداخت‌ها
- مدیریت نقش‌ها و permissions
- مشاهده analytics
- reindex جستجو

### Platform

- Audit log برای عملیات حساس
- Request ID / Trace ID
- Prometheus metrics endpoint
- Observability dashboard پایه
- Error tracking webhook
- CSP report-only
- Dockerized workers

---

## APIهای مهم

Backend با prefix زیر اجرا می‌شود:

```text
/api/v1
```

نمونه endpointها:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/refresh

GET  /api/v1/products
GET  /api/v1/products/:id
GET  /api/v1/categories
GET  /api/v1/search/products

GET  /api/v1/cart/my
POST /api/v1/cart/add
POST /api/v1/orders
POST /api/v1/payments/create
POST /api/v1/coupons/validate
POST /api/v1/shipping/quote

GET  /api/v1/addresses/my
POST /api/v1/addresses
PUT  /api/v1/addresses/:id
PATCH /api/v1/addresses/:id/default
DELETE /api/v1/addresses/:id

GET  /api/v1/admin/products
POST /api/v1/admin/products
GET  /api/v1/admin/categories
POST /api/v1/admin/categories
```

---

## Observability

### Metrics

```text
GET /metrics
```

Prometheus format شامل:

- HTTP request count
- HTTP duration histogram
- exception count
- process uptime
- memory usage

### Dashboard

```text
GET /observability/dashboard
```

نیازمند admin role.

### Error tracking

```env
ERROR_TRACKING_WEBHOOK_URL=
```

اگر مقداردهی شود، خطاهای 5xx به webhook ارسال می‌شوند.

---

## Security

پیاده‌سازی‌های موجود:

- Helmet در backend
- Secure cookies در production
- JWT issuer/audience
- Refresh token rotation
- Token family reuse detection
- CSRF double-submit
- CORS محدود
- Password pepper
- OTP HMAC hashing
- Upload validation با magic bytes
- CSP report-only در frontend
- Secret scanning و Docker/Kubernetes-style file secrets
- Security headers سخت‌گیرانه
- Audit logs
- Request/Trace correlation

CSP:

```text
docs/csp.md
```

---

## Production notes

برای production حتماً موارد زیر را انجام دهید:

1. `APP_ENV=production`
2. همه secrets را از secret manager تزریق کنید.
3. HTTPS و reverse proxy تنظیم کنید.
4. `CSP_MODE=enforce` را فقط بعد از بررسی report-only فعال کنید.
5. MongoDB را به صورت replica set/managed cluster اجرا کنید.
6. Backup/restore MongoDB را فعال کنید.
7. SMTP/SMS/Meilisearch production credentials را تنظیم کنید.
8. `ERROR_TRACKING_WEBHOOK_URL` یا سرویس error tracking واقعی تنظیم کنید.
9. workerها را جدا از API scale کنید.

---

## مستندات تکمیلی

```text
docs/docker.md
docs/local-dev-with-docker-infra.md
docs/e2e.md
docs/csp.md
docs/secrets.md
docs/PROJECT_STATE.md
```

---

## وضعیت Production Readiness

پروژه اکنون از حالت architecture-only خارج شده و دارای implementation فعال، تست، CI، Docker، security hardening، observability و E2E است. با این حال برای production کامل هنوز مواردی مانند payment gateway واقعی، backup/restore عملیاتی، deployment production و مانیتورینگ خارجی باید نهایی شوند.
