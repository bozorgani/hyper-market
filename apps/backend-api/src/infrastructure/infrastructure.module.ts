import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { DatabaseTransactionService } from './database/database-transaction.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { LoggerService } from './logger/logger.service';
import { RedisThrottlerStorage } from './security/redis-throttler-storage';

@Global()
@Module({
  imports: [CacheModule, IdempotencyModule],
  providers: [LoggerService, DatabaseTransactionService, RedisThrottlerStorage],
  exports: [CacheModule, IdempotencyModule, LoggerService, DatabaseTransactionService, RedisThrottlerStorage],
})
export class InfrastructureModule {}
