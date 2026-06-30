import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { TokenHashService } from '../../../infrastructure/security/token-hash.service';
import { TokenService } from '../../../infrastructure/security/token.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { SessionRepository } from '../repositories/session.repository';
import { UsersService } from '../../users/services/users.service';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

type CreateRefreshTokenData = {
  userId: string;
  sessionId: string;
  deviceId?: string | null;
  refreshToken: string;
  tokenVersion: number;
};

type RefreshTokenResult = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly tokenHashService: TokenHashService,
    private readonly usersService: UsersService,
  ) {}

  async createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const refreshExpiresAt = this.getRefreshTokenExpiryDate();
    const tokenHash = this.tokenHashService.hashToken(data.refreshToken);
    const payload = this.tokenService.verifyRefreshToken(data.refreshToken);

    return this.refreshTokenRepository.create({
      userId: new Types.ObjectId(data.userId),
      sessionId: new Types.ObjectId(data.sessionId),
      deviceId: data.deviceId ?? undefined,
      tokenHash,
      tokenVersion: data.tokenVersion,
      jti: payload.jti,
      tokenFamilyId: randomUUID(),
      expiresAt: refreshExpiresAt,
    });
  }

  async refreshAccessToken(
    rawRefreshToken: string,
    context: { ipAddress?: string | null; userAgent?: string | null; deviceId?: string | null } = {},
  ): Promise<RefreshTokenResult> {
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    const refreshTokenHash = this.tokenHashService.hashToken(rawRefreshToken);

    const storedRefreshToken = await this.refreshTokenRepository.findByTokenHash(refreshTokenHash);

    if (!storedRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedRefreshToken.revokedAt) {
      await this.handleRefreshTokenReuse(storedRefreshToken, payload, context);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (storedRefreshToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.getUserById(payload.sub);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid token version');
    }

    const refreshExpiresAt = this.getRefreshTokenExpiryDate();

    const rotatedRefreshPayload: JwtPayload = {
      sub: payload.sub,
      role: payload.role,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      tokenVersion: payload.tokenVersion,
      jti: randomUUID(),
    };

    const accessPayload: JwtPayload = {
      ...rotatedRefreshPayload,
      jti: randomUUID(),
    };

    const accessToken = this.tokenService.generateAccessToken(accessPayload);
    const newRefreshToken = this.tokenService.generateRefreshToken(rotatedRefreshPayload);

    const createdRefreshToken = await this.refreshTokenRepository.create({
      userId: new Types.ObjectId(payload.sub),
      sessionId: new Types.ObjectId(payload.sessionId!),
      deviceId: payload.deviceId ?? undefined,
      tokenHash: this.tokenHashService.hashToken(newRefreshToken),
      tokenVersion: payload.tokenVersion,
      jti: rotatedRefreshPayload.jti,
      tokenFamilyId: storedRefreshToken.tokenFamilyId,
      expiresAt: refreshExpiresAt,
    });

    await this.refreshTokenRepository.revokeToken(
      getEntityId(storedRefreshToken),
      getEntityId(createdRefreshToken),
    );

    await this.sessionRepository.updateLastActive(payload.sessionId!);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeToken(tokenId: string, newTokenId?: string): Promise<void> {
    await this.refreshTokenRepository.revokeToken(tokenId, newTokenId);
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.revokeToken(tokenId);
  }

  async create(data: any): Promise<any> {
    return this.refreshTokenRepository.create(data);
  }

  async findByTokenHash(hash: string): Promise<any> {
    return this.refreshTokenRepository.findByTokenHash(hash);
  }

  async markReuseDetected(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.markReuseDetected(tokenId);
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepository.revokeTokenFamily(familyId);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllUserTokens(userId);
  }

  async findActiveToken(userId: string, deviceId?: string | null): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findActiveToken(userId, deviceId ?? undefined);
  }

  private async handleRefreshTokenReuse(
    storedRefreshToken: RefreshToken,
    payload: JwtPayload,
    context: any,
  ): Promise<void> {
    await this.refreshTokenRepository.markReuseDetected(getEntityId(storedRefreshToken));
    await this.refreshTokenRepository.revokeTokenFamily(storedRefreshToken.tokenFamilyId);
    await this.sessionRepository.revokeAllUserSessions(payload.sub);
    await this.usersService.incrementTokenVersion(payload.sub);
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? '30d'));
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 30 * 24 * 60 * 60 * 1000;

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }
}