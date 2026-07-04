import { Injectable } from '@nestjs/common';
import { RedisService } from '../../cache/redis.service';
import { HealthIndicator, HealthIndicatorResult } from '../health-indicators.interface';

@Injectable()
export class RedisHealthIndicator implements HealthIndicator {
  readonly name = 'redis';

  constructor(private readonly redisService: RedisService) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      const rawClient = (this.redisService as any).client;
      if (!rawClient) {
        return { status: 'down', error: 'Redis client not initialized' };
      }
      const result = await rawClient.ping();
      return {
        status: result === 'PONG' ? 'ok' : 'degraded',
        latencyMs: Date.now() - start,
        meta: { status: rawClient.status },
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
