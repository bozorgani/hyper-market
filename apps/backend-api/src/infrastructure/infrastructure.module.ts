import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { DatabaseTransactionService } from './database/database-transaction.service';
import { HealthController } from './health/health.controller';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { LoggerService } from './logger/logger.service';

@Global()
@Module({
  imports: [CacheModule, IdempotencyModule],
  controllers: [HealthController],
  providers: [LoggerService, DatabaseTransactionService],
  exports: [CacheModule, IdempotencyModule, LoggerService, DatabaseTransactionService],
})
export class InfrastructureModule {}
