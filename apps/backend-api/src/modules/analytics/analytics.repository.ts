import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { AnalyticsEvent, AnalyticsEventDocument, AnalyticsEventType } from './schemas/event.schema';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private readonly analyticsEventModel: Model<AnalyticsEventDocument>,
  ) {}

  /**
   * Create an analytics event, de-duplicating by `dedupeKey` when present.
   *
   * The schema already has a sparse unique index on `dedupeKey`, so a duplicate
   * insert will throw a MongoError (code 11000). We catch that and return the
   * existing document instead — making the operation idempotent for events
   * sourced from the durable event bus (outbox relay redeliveries).
   */
  async create(data: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    if (data.dedupeKey) {
      try {
        const event = new this.analyticsEventModel(data);
        return await event.save();
      } catch (error: unknown) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
          // Duplicate dedupeKey — return existing document
          const existing = await this.analyticsEventModel
            .findOne({ dedupeKey: data.dedupeKey })
            .lean()
            .exec();
          return existing ?? new this.analyticsEventModel(data);
        }
        throw error;
      }
    }

    // Events without a dedupeKey (e.g. client-side page views) are always
    // inserted — the sparse unique index does not apply to null values.
    const event = new this.analyticsEventModel(data);
    return event.save();
  }

  async countByType(type: AnalyticsEventType): Promise<number> {
    return this.analyticsEventModel.countDocuments({ type }).exec();
  }

  async countDistinctUsers(): Promise<number> {
    const users = await this.analyticsEventModel.distinct('userId', {
      userId: { $ne: null },
    });
    return users.length;
  }

  async aggregate<T = Record<string, unknown>>(pipeline: PipelineStage[]): Promise<T[]> {
    return this.analyticsEventModel.aggregate<T>(pipeline).exec();
  }
}
