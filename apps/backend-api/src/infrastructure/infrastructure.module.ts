import { Global, Module } from '@nestjs/common';
import { REDIS_CLIENT, redisProvider } from './cache/redis.provider';
import { LoggerService } from './logger/logger.service';

@Global()
@Module({
  providers: [LoggerService, redisProvider],
  exports: [LoggerService, REDIS_CLIENT],
})
export class InfrastructureModule {}
