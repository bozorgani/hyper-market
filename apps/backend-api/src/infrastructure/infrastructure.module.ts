import { Global, Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { DatabaseTransactionService } from './database/database-transaction.service';
import { HealthController } from './health/health.controller';
import { LoggerService } from './logger/logger.service';

@Global()
@Module({
  imports: [CacheModule],
  controllers: [HealthController],
  providers: [LoggerService, DatabaseTransactionService],
  exports: [CacheModule, LoggerService, DatabaseTransactionService],
})
export class InfrastructureModule {}
