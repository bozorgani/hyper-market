// Stub required environment variables BEFORE any NestJS module is imported.
// ConfigModule validation runs at import-time, so these must be set early.
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'mongodb://localhost:27017/hypermarket_test';
if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://localhost:6379';
if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'test-access-token-e2e-min-32chars!!';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-token-e2e-min-32chars!';
if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = 'http://localhost:3000';
if (!process.env.APP_ENV) process.env.APP_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/orders (GET) should require authentication', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(401);
  });
});
