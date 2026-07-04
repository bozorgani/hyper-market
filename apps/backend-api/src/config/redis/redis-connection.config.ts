import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'bullmq';

/**
 * Build BullMQ-compatible Redis connection options from environment variables.
 *
 * Previously, `createRedisConnectionOptions()` was duplicated across:
 *   - queue.service.ts
 *   - mail.worker.ts
 *   - search.worker.ts
 *   - outbox-relay.worker.ts
 *
 * This single function replaces all of them. It reads from the same env vars:
 *   REDIS_URL       — takes precedence (parsed into host/port/password/db)
 *   REDIS_HOST      — fallback host
 *   REDIS_PORT      — fallback port (default: 6379)
 *   REDIS_PASSWORD  — optional password
 *   REDIS_DB        — optional DB index
 */
export function createBullMQRedisOptions(configService: ConfigService): RedisOptions {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    return {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      db: parsedUrl.pathname ? parseInt(parsedUrl.pathname.replace('/', ''), 10) || 0 : 0,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
  }

  return {
    host: configService.get<string>('REDIS_HOST'),
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: configService.get<string>('REDIS_PASSWORD'),
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  };
}
