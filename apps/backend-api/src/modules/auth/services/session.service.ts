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

  async create(data: CreateSessionData): Promise<Session> {
    return this.sessionRepository.create({
      userId: data.userId,
      deviceId: data.deviceId || undefined,
      ipAddress: data.ipAddress || undefined,
      userAgent: data.userAgent || undefined,
      lastActiveAt: new Date(),
      expiresAt: data.expiresAt,
    });
  }

  async createSession(data: CreateSessionData): Promise<Session> {
    return this.create(data);
  }

  async findActiveSession(userId: string, deviceId?: string | null): Promise<Session | null> {
    return this.sessionRepository.findActiveSession(userId, deviceId || undefined);
  }

  async findByUserAndDevice(userId: string, deviceId?: string | null): Promise<Session | null> {
    return this.sessionRepository.findByUserAndDevice(userId, deviceId || undefined);
  }

  async updateLastActive(sessionId: string): Promise<void> {
    await this.sessionRepository.updateLastActive(sessionId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revokeSession(sessionId);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllUserSessions(userId);
  }

  async getActiveSession(userId: string, deviceId: string): Promise<Session | null> {
    return this.sessionRepository.findActiveSession(userId, deviceId);
  }
}