import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { OutboxRepository } from './repositories/outbox.repository';

export type OutboxEventInput = {
  type: string;
  payload: unknown;
  timestamp: number;
};

/**
 * Persistence-facing half of the durable event bus.
 *
 * This service only writes/reads the outbox collection. Delivery to subscribers
 * is performed by EventBusService (synchronously) and by OutboxRelayWorker
 * (asynchronously, for recovery). Keeping persistence separate avoids a
 * circular dependency with the in-process EventBusService.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly repository: OutboxRepository) {}

  /** Deterministic idempotency key for an event (ignores timestamp). */
  static computeDedupeKey(event: OutboxEventInput): string {
    const canonical = JSON.stringify({
      type: event.type,
      payload: event.payload,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  async persist(event: OutboxEventInput): Promise<string> {
    const dedupeKey = OutboxService.computeDedupeKey(event);
    await this.repository.savePending({ ...event, dedupeKey });
    return dedupeKey;
  }

  async markDispatched(dedupeKey: string): Promise<void> {
    await this.repository.markDispatched(dedupeKey);
  }

  async incrementAttempts(dedupeKey: string): Promise<void> {
    await this.repository.incrementAttempts(dedupeKey);
  }

  async markFailed(dedupeKey: string, error: string): Promise<void> {
    await this.repository.markFailed(dedupeKey, error);
  }

  async findPendingOlderThan(before: Date, limit?: number) {
    return this.repository.findPendingOlderThan(before, limit);
  }
}
