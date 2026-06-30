import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../cache/redis.service';

export type IdempotencyResult<T> = {
  status: 'created' | 'replayed';
  data: T;
};

type StoredResponse<T> = {
  requestHash: string;
  response: T;
};

@Injectable()
export class IdempotencyService {
  private readonly ttlSeconds = Number(process.env.IDEMPOTENCY_KEY_TTL_SECONDS ?? 86400);

  constructor(private readonly redisService: RedisService) {}

  async execute<T>(
    scope: string,
    key: string | undefined,
    requestPayload: unknown,
    operation: () => Promise<T>,
  ): Promise<IdempotencyResult<T>> {
    if (!key) {
      return { status: 'created', data: await operation() };
    }

    this.validateKey(key);

    const responseKey = this.getResponseKey(scope, key);
    const lockKey = this.getLockKey(scope, key);
    const requestHash = this.hashPayload(requestPayload);
    const existing = await this.redisService.get<StoredResponse<T>>(responseKey);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException('Idempotency key was used with a different request payload');
      }

      return { status: 'replayed', data: existing.response };
    }

    const lockAcquired = await this.redisService.setIfNotExists(
      lockKey,
      requestHash,
      Math.min(this.ttlSeconds, 60),
    );

    if (!lockAcquired) {
      throw new ConflictException('Request with this idempotency key is already in progress');
    }

    try {
      const response = await operation();
      await this.storeResponse(responseKey, requestHash, response);

      return { status: 'created', data: response };
    } finally {
      await this.redisService.delete(lockKey);
    }
  }


  private async storeResponse<T>(
    responseKey: string,
    requestHash: string,
    response: T,
  ): Promise<void> {
    try {
      await this.redisService.set<StoredResponse<unknown>>(
        responseKey,
        {
          requestHash,
          response: this.toSerializable(response),
        },
        this.ttlSeconds,
      );
    } catch {
      // Idempotency cache persistence must not turn a successful business
      // operation into a 500 response. A later retry will execute normally
      // if this cache write fails.
    }
  }

  private toSerializable(value: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(value)) as unknown;
    } catch {
      return value;
    }
  }

  private validateKey(key: string): void {
    if (!/^[a-zA-Z0-9:_-]{8,128}$/.test(key)) {
      throw new BadRequestException('Invalid idempotency key');
    }
  }

  private getResponseKey(scope: string, key: string): string {
    return `idempotency:${scope}:${key}:response`;
  }

  private getLockKey(scope: string, key: string): string {
    return `idempotency:${scope}:${key}:lock`;
  }

  private hashPayload(payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.sortValue(payload)))
      .digest('hex');
  }

  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.sortValue((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }

    return value;
  }
}
