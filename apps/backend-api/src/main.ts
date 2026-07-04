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
  const app = await NestFactory.create(AppModule, {
    logger: isProduction()
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const appEnv = configService.get<string>('APP_ENV', 'development');
  const allowedOrigins = parseCorsOrigins(
    configService.getOrThrow<string>('CORS_ORIGINS'),
  );
  const hasWildcardOrigin = allowedOrigins.includes('*');

  if (appEnv === 'production' && hasWildcardOrigin) {
    throw new Error('Wildcard CORS origin is not allowed in production');
  }

  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
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

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);

  // ── Run pending database migrations ────────────────────────────────
  if (process.env.SKIP_MIGRATIONS !== 'true') {
    try {
      const connection = app.get<Connection>(getConnectionToken() as any);
      const runner = new MigrationRunner(connection);
      await runner.run(migrations);
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
  }

  await app.listen(configService.get<number>('PORT', 3000));
}

bootstrap();
