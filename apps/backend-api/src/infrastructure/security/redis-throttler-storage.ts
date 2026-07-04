import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

export type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};
import { RedisService } from '../cache/redis.service';

/**
 * Redis-backed rate-limit storage for @nestjs/throttler.
 *
 * Replaces the default in-memory storage so that rate limits are shared
 * across all API instances — a hard requirement for production deployments
 * behind a load-balancer.
 *
 * Uses the existing RedisService (ioredis) — no new dependencies.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly keyPrefix = 'throttle:';

  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `${this.keyPrefix}${key}`;

    // Use a Redis pipeline for atomicity + performance
    const rawClient = (this.redisService as any).client;
    if (!rawClient) {
      // Fallback: if Redis client is not available, allow the request
      // (fail-open) instead of blocking all traffic.
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - ttl;

    // Remove expired entries and count current hits in a single pipeline
    const pipeline = rawClient.pipeline();
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
    pipeline.zcard(redisKey);
    pipeline.zadd(redisKey, now, `${now}:${Math.random().toString(36).slice(2)}`);
    pipeline.pexpire(redisKey, ttl);
    pipeline.zcard(redisKey);

    const results = await pipeline.exec();
    const totalHits = results?.[4]?.[1] ?? 1;

    // Check if blocked
    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit) {
      isBlocked = true;
      timeToBlockExpire = blockDuration > 0 ? blockDuration : ttl;

      // If blockDuration is set, store a block key
      if (blockDuration > 0) {
        const blockKey = `${redisKey}:blocked`;
        const blocked = await rawClient.set(blockKey, '1', 'PX', blockDuration, 'NX');
        if (blocked !== 'OK') {
          // Already blocked — get remaining TTL
          const remainingTtl = await rawClient.pttl(blockKey);
          timeToBlockExpire = remainingTtl > 0 ? remainingTtl : blockDuration;
        }
      }
    }

    // Calculate time to expire for the current window
    const oldestEntry = await rawClient.zrange(redisKey, 0, 0, 'WITHSCORES');
    const timeToExpire = oldestEntry?.[1]
      ? Math.max(0, ttl - (now - Number(oldestEntry[1])))
      : ttl;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
