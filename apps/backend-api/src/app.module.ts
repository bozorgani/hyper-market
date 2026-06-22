import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseConfig } from './config/database/database.config';
import { envConfig } from './config/env/env.config';
import { envValidation } from './config/env/env.validation';
import { jwtConfig } from './config/jwt/jwt.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
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
    InfrastructureModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
