import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { databaseConfig } from './config/database/database.config';
import { envConfig } from './config/env/env.config';
import { envValidation } from './config/env/env.validation';
import { EventBusModule } from './core/events/event-bus.module';
import { jwtConfig } from './config/jwt/jwt.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { CsrfProtectionMiddleware } from './infrastructure/security/csrf-protection.middleware';
import { SecurityModule } from './infrastructure/security/security.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';

// Rate limiting (ThrottlerModule + global ThrottlerGuard) is required in
// production for brute-force / abuse protection. In development and staging it
// is intentionally disabled so legitimate manual testing (e.g. a handful of
// rapid auth attempts) does not get 429'd. Flip APP_ENV/NODE_ENV to 'production'
// to re-enable it. See PROJECT_MAP risk: "in-memory throttling (not Redis-shared)".
const isProduction =
  process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

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
    ...(isProduction
      ? [
          ThrottlerModule.forRoot([
            {
              name: 'default',
              ttl: 60000,
              limit: 100,
            },
            {
              name: 'auth',
              ttl: 60000,
              limit: 5,
            },
            {
              name: 'sensitive',
              ttl: 60000,
              limit: 10,
            },
          ]),
        ]
      : []),
    EventBusModule,
    InfrastructureModule,
    SecurityModule,
    AnalyticsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SearchModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [
    ...(isProduction
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfProtectionMiddleware).forRoutes('*');
  }
}
