import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  OutboxEvent,
  OutboxEventDocument,
  OutboxStatus,
} from '../schemas/outbox.schema';

export type PersistOutboxInput = {
  type: string;
  payload: unknown;
  timestamp: number;
  dedupeKey: string;
};

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxEventModel: Model<OutboxEventDocument>,
  ) {}

  /**
   * Insert a PENDING row without ever creating a duplicate for the same
   * logical event (idempotent emit across restarts / retries).
   */
  async savePending(input: PersistOutboxInput): Promise<void> {
    await this.outboxEventModel
      .updateOne(
        { dedupeKey: input.dedupeKey },
        {
          $setOnInsert: {
            eventType: input.type,
            payload: input.payload,
            timestamp: input.timestamp,
            dedupeKey: input.dedupeKey,
            status: OutboxStatus.PENDING,
            attempts: 0,
            dispatchedAt: null,
            lastError: null,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async markDispatched(dedupeKey: string): Promise<void> {
    await this.outboxEventModel
      .updateOne(
        { dedupeKey },
        {
          $set: { status: OutboxStatus.DISPATCHED, dispatchedAt: new Date() },
        },
      )
      .exec();
  }

  async incrementAttempts(dedupeKey: string): Promise<void> {
    await this.outboxEventModel
      .updateOne({ dedupeKey }, { $inc: { attempts: 1 } })
      .exec();
  }

  async markFailed(dedupeKey: string, error: string): Promise<void> {
    await this.outboxEventModel
      .updateOne(
        { dedupeKey },
        {
          $set: { status: OutboxStatus.FAILED, lastError: error },
          $inc: { attempts: 1 },
        },
      )
      .exec();
  }

  /** Relay sweep: fetch not-yet-confirmed rows older than the grace window. */
  async findPendingOlderThan(
    before: Date,
    limit = 100,
  ): Promise<OutboxEventDocument[]> {
    return this.outboxEventModel
      .find({ status: OutboxStatus.PENDING, createdAt: { $lte: before } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }
}
