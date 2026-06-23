import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseConfig } from './config/database/database.config';
import { envConfig } from './config/env/env.config';
import { envValidation } from './config/env/env.validation';
import { EventBusModule } from './core/events/event-bus.module';
import { jwtConfig } from './config/jwt/jwt.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
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
  providers: [],
})
export class AppModule {}
