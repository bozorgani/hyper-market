# توسعه محلی با Backend/Frontend روی Host و دیتابیس‌ها داخل Docker

اگر می‌خواهید لاگ‌های Next.js و NestJS را مستقیم در ترمینال خودتان ببینید، لازم نیست backend و web را داخل Docker اجرا کنید. پیشنهاد برای توسعه روزانه:

- MongoDB + Redis + Meilisearch داخل Docker
- Backend NestJS روی سیستم خودتان
- Frontend Next.js روی سیستم خودتان

## 1) اجرای زیرساخت‌ها

از ریشه پروژه:

```bash
docker compose -f docker-compose.infra.yml up -d
```

لاگ زیرساخت‌ها:

```bash
docker compose -f docker-compose.infra.yml logs -f mongo redis meilisearch
```

توقف زیرساخت‌ها:

```bash
docker compose -f docker-compose.infra.yml down
```

حذف کامل دیتاها:

```bash
docker compose -f docker-compose.infra.yml down -v
```

## 2) تنظیم env برای backend محلی

در `apps/backend-api/.env` یا env shell خودتان:

```env
PORT=3001
APP_ENV=development
DATABASE_URL=mongodb://localhost:27017/hyper_market?replicaSet=rs0
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
MEILI_HOST=http://localhost:7700
MEILI_API_KEY=hyper_market_meili_master_key_change_me
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PUBLIC_API_BASE_URL=http://localhost:3001
JWT_ACCESS_SECRET=change_me_access_secret_32_chars_minimum_123456789
JWT_REFRESH_SECRET=change_me_refresh_secret_32_chars_minimum_123456789
PASSWORD_PEPPER=local_password_pepper_32_chars_minimum_123456789
WORKERS_ENABLED=true
SKIP_MIGRATIONS=false
```

نکته مهم: در این compose، replica set با `localhost:27017` initiate می‌شود تا backendی که روی host اجرا می‌شود بتواند به MongoDB وصل شود.

## 3) اجرای backend روی سیستم خودتان

```bash
npm run backend:dev
```

یا:

```bash
npm run start:dev --workspace=apps/backend-api
```

در این حالت workerها هم داخل همان process اجرا می‌شوند، چون `WORKERS_ENABLED=true` است و لاگ‌ها کنار لاگ backend دیده می‌شوند.

اگر خواستید API و worker را در دو ترمینال جدا ببینید:

ترمینال API:

```bash
WORKERS_ENABLED=false npm run backend:dev
```

ترمینال Worker:

```bash
cd apps/backend-api
WORKERS_ENABLED=true SKIP_MIGRATIONS=true npx nest start --watch --entryFile worker
```

## 4) اجرای frontend روی سیستم خودتان

برای اینکه frontend به backend لوکال وصل شود:

```bash
cd apps/web
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1 npm run dev
```

یا از ریشه monorepo:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1 npm run dev --workspace=apps/web
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:3001
```

Health:

```bash
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
```

## 5) تفاوت با docker-compose.yml اصلی

- `docker-compose.yml` برای اجرای کل stack داخل Docker است: web + backend + worker + infra.
- `docker-compose.infra.yml` فقط دیتابیس‌ها و سرویس‌های زیرساخت را اجرا می‌کند و برای توسعه روزانه مناسب‌تر است.

اگر backend/frontend را روی سیستم خودتان اجرا می‌کنید، از `docker-compose.infra.yml` استفاده کنید نه `docker-compose.yml` اصلی.
