// Stub required environment variables BEFORE any NestJS module is imported.
// ConfigModule validation runs at import-time, so these must be set early.
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'mongodb://localhost:27017/hypermarket_test';
if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://localhost:6379';
if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'test-access-token-e2e-min-32chars!!';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-token-e2e-min-32chars!';
if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = 'http://localhost:3000';
if (!process.env.APP_ENV) process.env.APP_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user with email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'StrongPass123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'verification otp sent');
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
          deviceId: 'e2e-test-device',
        })
        .expect(401);
    });
  });
});
