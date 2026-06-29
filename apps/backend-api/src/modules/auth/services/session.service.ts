import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { SessionRepository } from '../repositories/session.repository';
import { Session } from '../schemas/session.schema';

type CreateSessionData = {
  userId: string;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createSession(data: CreateSessionData): Promise<Session> {
    return this.sessionRepository.create({
      userId: new Types.ObjectId(data.userId),
      deviceId: data.deviceId ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      lastActiveAt: new Date(),
      expiresAt: data.expiresAt,
    });
  }

  async findActiveSession(userId: string, deviceId?: string | null): Promise<Session | null> {
    return this.sessionRepository.findActiveSession(userId, deviceId ?? undefined);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeSession(sessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllUserSessions(userId);
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.sessionRepository.updateLastActive(sessionId);
  }

  async findByUserAndDevice(userId: string, deviceId?: string | null): Promise<Session | null> {
    return this.sessionRepository.findByUserAndDevice(userId, deviceId ?? undefined);
  }

  async getActiveSession(userId: string, deviceId: string): Promise<Session | null> {
    return this.sessionRepository.findActiveSession(userId, deviceId);
  }
}