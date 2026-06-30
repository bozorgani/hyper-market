import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const options = this.createRedisOptions();

    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (value === null) {
      return null;
    }

    return this.deserialize<T>(value);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serializedValue = this.serialize(value);

    if (ttl) {
      await this.client.set(key, serializedValue, 'EX', ttl);
      return;
    }

    await this.client.set(key, serializedValue);
  }

  async setIfNotExists<T>(key: string, value: T, ttl: number): Promise<boolean> {
    const serializedValue = this.serialize(value);
    const result = await this.client.set(key, serializedValue, 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  private createRedisOptions(): RedisOptions {
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const db = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined;

    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
  }

  private serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }
}
