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

  async create(data: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
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
