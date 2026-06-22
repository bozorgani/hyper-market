import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { OtpType } from '../enums/otp-type.enum';
import { OtpCode } from '../schemas/otp-code.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { Session } from '../schemas/session.schema';
import { OtpRepository } from '../repositories/otp.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly otpRepository: OtpRepository,
  ) {}

  async findUserByEmail(email: string) {
    return this.usersService.getUserByEmail(email);
  }

  async createRefreshToken(data: Partial<RefreshToken>) {
    return this.refreshTokenRepository.create(data);
  }

  async createSession(data: Partial<Session>) {
    return this.sessionRepository.create(data);
  }

  async createOtp(data: Partial<OtpCode>) {
    return this.otpRepository.create(data);
  }

  async getActiveSession(userId: string, deviceId: string) {
    return this.sessionRepository.findActiveSession(userId, deviceId);
  }

  async revokeSession(sessionId: string) {
    return this.sessionRepository.revokeSession(sessionId);
  }

  async revokeAllSessions(userId: string) {
    return this.sessionRepository.revokeAllUserSessions(userId);
  }

  async getRefreshToken(userId: string, deviceId: string) {
    return this.refreshTokenRepository.findActiveToken(userId, deviceId);
  }

  async revokeRefreshToken(tokenId: string) {
    return this.refreshTokenRepository.revokeToken(tokenId);
  }

  async getValidOtp(target: string, type: OtpType) {
    return this.otpRepository.findValidOtp(target, type);
  }

  async markOtpVerified(otpId: string) {
    return this.otpRepository.markVerified(otpId);
  }

  async incrementOtpAttempts(otpId: string) {
    return this.otpRepository.incrementAttempts(otpId);
  }
}
