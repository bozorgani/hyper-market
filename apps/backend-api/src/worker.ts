/**
 * Standalone BullMQ worker process.
 *
 * Run with: npx nest start --entryFile worker
 *
 * This process only starts the BullMQ workers (mail, search, outbox-relay)
 * without the HTTP server or any controller overhead. It shares the same
 * NestJS modules and DI container so workers can access all services.
 *
 * Environment variables:
 *   WORKERS_ENABLED=true   (required — main API process sets this to false)
 *   All regular .env vars  (DATABASE_URL, REDIS_URL, etc.)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './infrastructure/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = app.get(LoggerService);
  logger.info('[WORKER] Standalone worker process started', {
    pid: process.pid,
    workers: ['mail', 'search', 'outbox-relay'],
  });

  // Keep the process alive — BullMQ workers run as background listeners
  process.on('SIGTERM', async () => {
    logger.info('[WORKER] SIGTERM received — shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('[WORKER] SIGINT received — shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error('[WORKER] Failed to start worker process:', error);
  process.exit(1);
});
