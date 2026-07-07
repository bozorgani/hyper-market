import {
  RequestMethod,
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger/swagger.config';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { SanitizePipe } from './core/pipes/sanitize.pipe';
import { migrations } from './migrations';
import { MigrationRunner } from './migrations/migration-runner';

function parseCorsOrigins(origins: string): string[] {
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isProduction(): boolean {
  return process.env.APP_ENV === 'production';
}

async function bootstrap() {
  console.log('[STARTUP] START creating Nest application');
  const app = await NestFactory.create(AppModule, {
    logger: isProduction()
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  console.log('[STARTUP] SUCCESS Nest application created');

  const configService = app.get(ConfigService);
  const appEnv = configService.get<string>('APP_ENV', 'development');
  console.log(`[STARTUP] SUCCESS configuration loaded (APP_ENV=${appEnv})`);
  const allowedOrigins = parseCorsOrigins(
    configService.getOrThrow<string>('CORS_ORIGINS'),
  );
  const hasWildcardOrigin = allowedOrigins.includes('*');

  if (appEnv === 'production' && hasWildcardOrigin) {
    throw new Error('Wildcard CORS origin is not allowed in production');
  }

  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
      },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xXssProtection: true,
    }),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, success?: boolean) => void,
    ) => {
      if (!origin && appEnv !== 'production') {
        callback(null, true);
        return;
      }

      if (hasWildcardOrigin && appEnv !== 'production') {
        callback(null, true);
        return;
      }

      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin is not allowed'), false);
    },
    credentials: true,
  });

  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new SanitizePipe(), // XSS prevention - sanitizes all string inputs
  );
  setupSwagger(app);

  // ── Run pending database migrations ────────────────────────────────
  if (process.env.SKIP_MIGRATIONS !== 'true') {
    console.log('[STARTUP] START database migrations');
    try {
      const connection = app.get<Connection>(getConnectionToken() as any);
      const runner = new MigrationRunner(connection);
      await runner.run(migrations);
      console.log('[STARTUP] SUCCESS database migrations');
    } catch (error) {
      console.error(
        '[MIGRATIONS] Migration runner failed — application will continue but data may be inconsistent.',
        error instanceof Error ? error.message : String(error),
      );
      // In production, fail fast if migrations fail
      if (isProduction()) {
        process.exit(1);
      }
    }
  } else {
    console.log('[STARTUP] SKIPPED database migrations (SKIP_MIGRATIONS=true)');
  }

  const port = configService.get<number>('PORT', 3000);
  console.log(`[STARTUP] START HTTP server on port ${port}`);
  await app.listen(port);
  console.log(`[STARTUP] SUCCESS HTTP server listening on port ${port}`);
}

bootstrap();
