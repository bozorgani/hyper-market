import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * Generic caching service with TTL support and intelligent invalidation.
 * 
 * Features:
 * - TTL-based expiration
 * - JSON serialization/deserialization
 * - Pattern-based invalidation
 * - Graceful degradation (works without Redis)
 * - Cache-aside pattern implementation
 * 
 * @example
 * ```typescript
 * // Simple get/set
 * await cache.set('user:123', userData, 3600); // 1 hour TTL
 * const user = await cache.get<User>('user:123');
 * 
 * // Get or set pattern
 * const products = await cache.getOrSet(
 *   'products:list:page:1',
 *   async () => productsService.findAll(),
 *   300 // 5 minutes TTL
 * );
 * 
 * // Pattern-based invalidation
 * await cache.invalidatePattern('products:*');
 * ```
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly isRedisAvailable: boolean;

  constructor(@Optional() private readonly redisService?: RedisService) {
    this.isRedisAvailable = !!redisService;
    if (!this.isRedisAvailable) {
      this.logger.warn('Redis not available - caching disabled');
    }
  }

  /**
   * Get a cached value by key
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable) {
      return null;
    }

    try {
      const value = await this.redisService!.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache get failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds
   * @returns True if successful
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redisService!.set(key, serialized, ttlSeconds);
      return true;
    } catch (error) {
      this.logger.warn(`Cache set failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete a cached value by key
   * 
   * @param key - Cache key
   * @returns True if successful
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      await this.redisService!.delete(key);
      return true;
    } catch (error) {
      this.logger.warn(`Cache delete failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get a cached value or compute and cache it
   * 
   * Implements the cache-aside pattern: check cache first, if miss,
   * compute the value, cache it, and return it.
   * 
   * @param key - Cache key
   * @param factory - Async function to compute value if not cached
   * @param ttlSeconds - Time to live in seconds
   * @returns Cached or computed value
   * 
   * @example
   * ```typescript
   * const products = await cache.getOrSet(
   *   'products:list',
   *   async () => await productsService.findAll(),
   *   300 // 5 minutes
   * );
   * ```
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - compute the value
    const value = await factory();

    // Cache the computed value (fire and forget)
    this.set(key, value, ttlSeconds).catch(() => {
      // Ignore cache set failures
    });

    return value;
  }

  /**
   * Invalidate all keys matching a pattern
   * 
   * Uses Redis SCAN to find matching keys and delete them.
   * Pattern uses Redis glob-style wildcards (*, ?, []).
   * 
   * @param pattern - Redis pattern (e.g., 'products:*', 'user:123:*')
   * @returns Number of keys invalidated
   * 
   * @example
   * ```typescript
   * // Invalidate all product caches
   * await cache.invalidatePattern('products:*');
   * 
   * // Invalidate all caches for a specific user
   * await cache.invalidatePattern('user:123:*');
   * ```
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isRedisAvailable) {
      return 0;
    }

    try {
      const client = (this.redisService as any).client;
      if (!client || typeof client.scan !== 'function') {
        this.logger.warn('Redis client does not support SCAN');
        return 0;
      }

      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.delete(key)));
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      this.logger.debug(`Invalidated ${totalDeleted} cache keys matching: ${pattern}`);
      return totalDeleted;
    } catch (error) {
      this.logger.warn(`Cache invalidation failed for pattern: ${pattern}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * 
   * @param key - Cache key
   * @returns True if key exists and not expired
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      return await this.redisService!.exists(key);
    } catch (error) {
      this.logger.warn(`Cache exists check failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get the remaining TTL for a key
   * 
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    if (!this.isRedisAvailable) {
      return -2;
    }

    try {
      const client = (this.redisService as any).client;
      if (!client || typeof client.ttl !== 'function') {
        return -1;
      }
      return await client.ttl(key);
    } catch (error) {
      this.logger.warn(`Cache TTL check failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return -2;
    }
  }

  /**
   * Increment a numeric value atomically
   * 
   * @param key - Cache key
   * @param increment - Amount to increment (default: 1)
   * @param ttlSeconds - Optional TTL to set if key doesn't exist
   * @returns New value after increment
   */
  async increment(
    key: string,
    increment = 1,
    ttlSeconds?: number,
  ): Promise<number> {
    if (!this.isRedisAvailable) {
      return 0;
    }

    try {
      const client = (this.redisService as any).client;
      if (!client || typeof client.incrby !== 'function') {
        return 0;
      }

      const newValue = await client.incrby(key, increment);

      if (ttlSeconds && newValue === increment) {
        // Key was just created, set TTL
        await client.expire(key, ttlSeconds);
      }

      return newValue;
    } catch (error) {
      this.logger.warn(`Cache increment failed for key: ${key}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}
