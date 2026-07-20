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
