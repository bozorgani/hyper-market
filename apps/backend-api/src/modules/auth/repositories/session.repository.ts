import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Session, SessionDocument } from '../schemas/session.schema';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(data: Partial<Session>): Promise<Session> {
    const session = new this.sessionModel(data);
    return session.save();
  }

  async findById(id: string): Promise<Session | null> {
    if (!isValidObjectId(id)) return null;
    return this.sessionModel.findById(id).lean().exec();
  }

  async findActiveSession(
    userId: string,
    deviceId: string,
  ): Promise<Session | null> {
    return this.sessionModel
      .findOne({ userId, deviceId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .lean()
      .exec();
  }

  async updateLastActive(id: string): Promise<Session | null> {
    if (!isValidObjectId(id)) return null;
    return this.sessionModel
      .findByIdAndUpdate(id, { lastActiveAt: new Date() }, { new: true })
      .exec();
  }

  async revokeSession(id: string): Promise<Session | null> {
    if (!isValidObjectId(id)) return null;
    return this.sessionModel
      .findByIdAndUpdate(id, { revokedAt: new Date() }, { new: true })
      .exec();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionModel
      .updateMany({ userId, revokedAt: null }, { revokedAt: new Date() })
      .exec();
  }
}
