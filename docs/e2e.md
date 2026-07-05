# E2E test infrastructure

Backend E2E tests need MongoDB, Redis and Meilisearch. MongoDB must run as a replica set because order/payment flows use transactions.

## Start dependencies

```bash
npm run e2e:infra:up
```

This uses:

```text
docker-compose.test.yml
```

It starts:

- MongoDB 7 with replica set `rs0`
- Redis 7
- Meilisearch

The compose file uses tmpfs-backed data directories so test state is disposable.

## Run backend E2E tests

```bash
npm run backend:test:e2e
```

Equivalent direct command:

```bash
npm run test:e2e --workspace=apps/backend-api -- --runInBand
```

## Stop and clean dependencies

```bash
npm run e2e:infra:down
```

## Environment expected by tests

The CI workflow sets these values explicitly. For local runs, the E2E spec files also provide safe defaults, but you can override them:

```env
APP_ENV=test
DATABASE_URL=mongodb://localhost:27017/hypermarket_test?replicaSet=rs0
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
MEILI_HOST=http://localhost:7700
MEILI_API_KEY=hyper_market_meili_master_key_change_me
JWT_ACCESS_SECRET=test-access-secret-e2e-min-32chars!!
JWT_REFRESH_SECRET=test-refresh-secret-e2e-min-32chars!
PASSWORD_PEPPER=test-password-pepper-e2e-min-32chars!
OTP_HASH_SECRET=test-otp-hash-secret-e2e-min-32chars!
WORKERS_ENABLED=false
OUTBOX_RELAY_ENABLED=false
SEARCH_INDEXING_WORKER_ENABLED=false
```

## GitHub Actions

The `e2e` CI job uses the same `docker-compose.test.yml` file:

```bash
docker compose -f docker-compose.test.yml up -d --wait
npm run test:e2e --workspace=apps/backend-api -- --runInBand
docker compose -f docker-compose.test.yml down -v --remove-orphans
```
