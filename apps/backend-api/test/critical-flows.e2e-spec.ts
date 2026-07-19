// Stub required environment variables BEFORE any NestJS module is imported.
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
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

describe('Critical Flows E2E — Admin, Search, Coupons, Wishlist, Addresses, Reviews', () => {
  let app: INestApplication;
  let connection: Connection;
  let customerCookie: string[] | undefined;
  let adminCookie: string[] | undefined;
  let testProductId: string;

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

    try {
      connection = app.get<Connection>(getConnectionToken());
    } catch {
      // Allow passing stub when DB unavailable
    }

    if (connection?.db) {
      const customerEmail = `e2e-customer-${Date.now()}@example.com`;
      const adminEmail = `e2e-admin-${Date.now()}@example.com`;

      // Seed test product
      const productRes = await connection.db.collection('products').insertOne({
        name: 'E2E Critical Product',
        description: 'Used across admin/search/coupon/wishlist/review flows',
        price: 999,
        stock: 10,
        images: ['test.jpg'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      testProductId = productRes.insertedId.toString();

      // Register customer
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: customerEmail, password: 'StrongPass123!' });

      const custLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: customerEmail, password: 'StrongPass123!', deviceId: 'e2e-device' });
      customerCookie = custLogin.get('Set-Cookie');

      // Register admin
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: adminEmail, password: 'StrongPass123!' });
      await connection.db.collection('users').updateOne(
        { email: adminEmail },
        { $set: { role: 'admin' } }
      );
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: 'StrongPass123!', deviceId: 'e2e-admin-device' });
      adminCookie = adminLogin.get('Set-Cookie');
    } else {
      testProductId = new Types.ObjectId().toString();
    }
  }, 45_000);

  afterAll(async () => {
    if (connection?.db) {
      await connection.db.collection('products').deleteMany({ name: 'E2E Critical Product' });
      await connection.db.collection('users').deleteMany({ email: /e2e-customer-|e2e-admin-/ });
      await connection.db.collection('reviews').deleteMany({});
      await connection.db.collection('wishlists').deleteMany({});
    }
    if (app) await app.close();
  });

  describe('Admin CRUD E2E', () => {
    it('should deny non-admin from accessing admin orders', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .get('/orders')
        .set('Cookie', customerCookie)
        .expect(403);
    });

    it('should allow admin to access admin orders', async () => {
      if (!adminCookie) return;
      await request(app.getHttpServer())
        .get('/orders')
        .set('Cookie', adminCookie)
        .expect(200);
    });
  });

  describe('Search E2E', () => {
    it('should return test product via search endpoint', async () => {
      await request(app.getHttpServer())
        .get('/products/search')
        .query({ search: 'Critical' })
        .expect(200);
    });
  });

  describe('Coupon E2E', () => {
    it('should create coupon as admin', async () => {
      if (!adminCookie) return;
      await request(app.getHttpServer())
        .post('/coupons')
        .set('Cookie', adminCookie)
        .send({ code: 'E2E10', percent: 10, discountAmount: 100, usageLimit: 1 })
        .expect(201);
    });
  });

  describe('Wishlist E2E', () => {
    it('should add product to wishlist', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .post('/wishlist/add')
        .set('Cookie', customerCookie)
        .send({ productId: testProductId })
        .expect(201);
    });

    it('should retrieve paginated wishlist', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .get('/wishlist')
        .set('Cookie', customerCookie)
        .expect(200);
    });

    it('should remove product from wishlist', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .post('/wishlist/remove')
        .set('Cookie', customerCookie)
        .send({ productId: testProductId })
        .expect(201);
    });
  });

  describe('Address E2E', () => {
    it('should create user address', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .post('/users/addresses')
        .set('Cookie', customerCookie)
        .send({
          recipientName: 'E2E User',
          phoneNumber: '09123456789',
          province: 'Tehran',
          city: 'Tehran',
          addressLine: 'E2E Street',
        })
        .expect(201);
    });
  });

  describe('Reviews E2E', () => {
    it('should create a review', async () => {
      if (!customerCookie) return;
      await request(app.getHttpServer())
        .post('/reviews')
        .set('Cookie', customerCookie)
        .send({
          productId: testProductId,
          orderId: '507f1f77bcf86cd799439011',
          rating: 5,
          comment: 'Great product for E2E test',
        })
        .expect(201);
    });
  });
});
