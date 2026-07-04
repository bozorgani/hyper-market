# Docker / Compose راه‌اندازی محلی

این پروژه اکنون با Docker Compose سرویس‌های زیر را بالا می‌آورد:

- `web` — Next.js روی `http://localhost:3000`
- `backend` — NestJS API روی `http://localhost:3001`
- `worker` — پردازشگر BullMQ برای mail/search/outbox
- `mongo` — MongoDB 7 با replica set `rs0`
- `redis` — Redis 7
- `meilisearch` — Meilisearch روی `http://localhost:7700`

## اجرا

```bash
docker compose up --build
```

بعد از بالا آمدن سرویس‌ها:

```bash
curl http://localhost:3001/health/live
curl http://localhost:3001/health/ready
```

## Seed اولیه

بعد از اجرای Compose، در صورت نیاز می‌توانید seedها را داخل کانتینر backend اجرا کنید:

```bash
docker compose exec backend node scripts/seed-permissions.js
docker compose exec backend node scripts/seed-admin.js
docker compose exec backend node scripts/seed-products.js
```

> نکته: migrationهای backend در سرویس `backend` اجرا می‌شوند. سرویس `worker` با `SKIP_MIGRATIONS=true` اجرا می‌شود.

## متغیرهای محیطی مهم

Compose برای اجرای local مقدارهای امنِ پیش‌فرض production ندارد. برای محیط واقعی حتماً مقدارهای زیر را از طریق secret manager یا فایل `.env` امن override کنید:

```env
APP_ENV=production
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
PASSWORD_PEPPER=...
MEILI_MASTER_KEY=...
CORS_ORIGINS=https://your-domain.com
PUBLIC_API_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## نکته مهم درباره Cookie و HTTPS

در production، backend وقتی `APP_ENV=production` باشد cookieها را با `secure=true` تنظیم می‌کند؛ بنابراین برای auth واقعی باید پشت HTTPS اجرا شود. Compose پیش‌فرض با `APP_ENV=development` تنظیم شده تا login روی `localhost` و HTTP کار کند.

## توقف و حذف volumeها

```bash
docker compose down
# حذف دیتای Mongo/Redis/Meilisearch/uploads
 docker compose down -v
```
