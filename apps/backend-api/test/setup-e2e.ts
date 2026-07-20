// Shared E2E environment bootstrap.
// This file is loaded by Jest before each e2e spec, before AppModule imports.

const mongoTestPort = process.env.MONGO_TEST_PORT ?? '27018';
const redisTestPort = process.env.REDIS_TEST_PORT ?? '6380';
const meiliTestPort = process.env.MEILI_TEST_PORT ?? '7701';

// E2E must be isolated from the developer's normal .env / shell environment.
// Therefore infra URLs are intentionally assigned (not ??=). If a custom URL is
// needed, use the E2E_* variables below or MONGO_TEST_PORT/REDIS_TEST_PORT/etc.
process.env.APP_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `mongodb://localhost:${mongoTestPort}/hypermarket_test`;
process.env.REDIS_URL =
  process.env.E2E_REDIS_URL ?? `redis://localhost:${redisTestPort}`;
process.env.REDIS_HOST = process.env.E2E_REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.E2E_REDIS_PORT ?? redisTestPort;
process.env.MEILI_HOST =
  process.env.E2E_MEILI_HOST ?? `http://localhost:${meiliTestPort}`;
process.env.MEILI_API_KEY =
  process.env.E2E_MEILI_API_KEY ?? 'hyper_market_meili_master_key_change_me';

process.env.JWT_ACCESS_SECRET = 'test-access-token-e2e-min-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-token-e2e-min-32chars!';
process.env.PASSWORD_PEPPER = 'test-password-pepper-e2e-min-32chars!';
process.env.OTP_HASH_SECRET = 'test-otp-hash-secret-e2e-min-32chars';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.RATE_LIMIT_DEFAULT_LIMIT = '100000';
process.env.RATE_LIMIT_AUTH_LIMIT = '100000';
process.env.RATE_LIMIT_SENSITIVE_LIMIT = '100000';
process.env.RATE_LIMIT_DEFAULT_TTL_MS = '60000';
process.env.RATE_LIMIT_AUTH_TTL_MS = '60000';
process.env.RATE_LIMIT_SENSITIVE_TTL_MS = '60000';

// E2E tests use supertest directly, so browser-origin CSRF protection is not
// under test here. Dedicated CSRF unit tests cover the middleware behavior.
process.env.CSRF_PROTECTION_ENABLED = 'false';

// Keep e2e deterministic and avoid background workers touching shared services.
process.env.WORKERS_ENABLED = 'false';
process.env.OUTBOX_RELAY_ENABLED = 'false';
process.env.SEARCH_INDEXING_WORKER_ENABLED = 'false';
process.env.SKIP_MIGRATIONS = 'true';
process.env.MONGODB_TRANSACTION_FALLBACK_ENABLED = 'true';

jest.setTimeout(60_000);
