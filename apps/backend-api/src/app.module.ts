import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { databaseConfig } from './config/database/database.config';
import { envConfig } from './config/env/env.config';
import { envValidation } from './config/env/env.validation';
import { EventBusModule } from './core/events/event-bus.module';
import { jwtConfig } from './config/jwt/jwt.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RequestIdMiddleware } from './infrastructure/logger/request-id.middleware';
import { HealthModule } from './infrastructure/health/health.module';
import { CsrfProtectionMiddleware } from './infrastructure/security/csrf-protection.middleware';
import { RedisThrottlerStorage } from './infrastructure/security/redis-throttler-storage';
import { SecurityModule } from './infrastructure/security/security.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewModule } from './modules/reviews/review.module';
import { SearchModule } from './modules/search/search.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { UsersModule } from './modules/users/users.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';

// Rate limiting uses Redis-backed storage so limits are shared across all
// API instances behind a load-balancer. When Redis is unavailable the
// storage fails open (allows the request) instead of blocking all traffic.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
      load: [envConfig, jwtConfig],
      validate: envValidation,
      cache: true,
    }),
    MongooseModule.forRootAsync(databaseConfig),
    ThrottlerModule.forRootAsync({
      imports: [InfrastructureModule],
      inject: [RedisThrottlerStorage],
      useFactory: (
        redisThrottlerStorage: RedisThrottlerStorage,
      ): ThrottlerModuleOptions => ({
        storage: redisThrottlerStorage,
        throttlers: [
          {
            name: 'default',
            ttl: Number(process.env.RATE_LIMIT_DEFAULT_TTL_MS ?? 60000),
            limit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT ?? 1000),
          },
          {
            name: 'auth',
            ttl: Number(process.env.RATE_LIMIT_AUTH_TTL_MS ?? 60000),
            limit: Number(process.env.RATE_LIMIT_AUTH_LIMIT ?? 30),
          },
          {
            name: 'sensitive',
            ttl: Number(process.env.RATE_LIMIT_SENSITIVE_TTL_MS ?? 60000),
            limit: Number(process.env.RATE_LIMIT_SENSITIVE_LIMIT ?? 100),
          },
        ],
      }),
    }),
    EventBusModule,
    InfrastructureModule,
    ObservabilityModule,
    HealthModule,
    SecurityModule,
    AddressesModule,
    AuditModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SearchModule,
    ShippingModule,
    CategoriesModule,
    CartModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    ReviewModule,
    WishlistModule,
  ],
  controllers: [],
  providers: [
    HttpExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, CsrfProtectionMiddleware).forRoutes('*');
  }
}
