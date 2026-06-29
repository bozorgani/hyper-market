import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PasswordService } from '../../../infrastructure/security/password.service';
import { TokenHashService } from '../../../infrastructure/security/token-hash.service';
import { TokenService } from '../../../infrastructure/security/token.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { MailService } from '../../mail/mail.service';
import { SmsIrService } from '../../mail/sms-ir.service';
import { AccountStatus } from '../../users/enums/account-status.enum';
import { UserRole } from '../../users/enums/user-role.enum';
import { UserWithId } from '../../users/repositories/users.repository';
import { UsersService } from '../../users/services/users.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SendVerificationOtpDto } from '../dto/send-verification-otp.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { VerifyPhoneDto } from '../dto/verify-phone.dto';
import { OtpType } from '../enums/otp-type.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { OtpRepository } from '../repositories/otp.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OtpCode } from '../schemas/otp-code.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { Session } from '../schemas/session.schema';

type Persisted<T> = T & { _id: Types.ObjectId };

type AuthContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutMs = 15 * 60 * 1000;
  private readonly maxOtpAttempts = 5;
  private readonly verificationOtpExpiresMs = 10 * 60 * 1000;
  private readonly passwordResetOtpExpiresMs = 10 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly otpRepository: OtpRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tokenHashService: TokenHashService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly smsIrService: SmsIrService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.email && (await this.usersService.emailExists(dto.email))) {
      throw new ConflictException('Email already exists');
    }

    if (dto.phoneNumber && (await this.usersService.phoneExists(dto.phoneNumber))) {
      throw new ConflictException('Phone number already exists');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const user = await this.usersService.createUser({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      role: UserRole.CUSTOMER,
      accountStatus: AccountStatus.PENDING,
      tokenVersion: 1,
    });

    const userId = getEntityId(user);

    if (user.email) {
      await this.createVerificationOtp(userId, user.email, OtpType.EMAIL_VERIFY);
    }

    if (user.phoneNumber) {
      await this.createVerificationOtp(userId, user.phoneNumber, OtpType.PHONE_VERIFY);
    }

    return {
      id: userId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      accountStatus: user.accountStatus,
      message: 'verification otp sent',
    };
  }

  async sendVerificationOtp(dto: SendVerificationOtpDto) {
    const user = await this.findUserByTarget(dto.email, dto.phoneNumber);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const userId = getEntityId(user);

    if (dto.email) {
      await this.createVerificationOtp(userId, dto.email, OtpType.EMAIL_VERIFY);
    }

    if (dto.phoneNumber) {
      await this.createVerificationOtp(userId, dto.phoneNumber, OtpType.PHONE_VERIFY);
    }

    return { message: 'verification otp sent' };
  }

  async verifyEmail(dto: VerifyEmailDto, context: AuthContext = {}) {
    const user = await this.usersService.getUserByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }

    await this.verifyOtpCode(dto.email, OtpType.EMAIL_VERIFY, dto.code, context);
    await this.usersService.verifyEmail(getEntityId(user));

    return { message: 'email verified' };
  }

  async verifyPhone(dto: VerifyPhoneDto, context: AuthContext = {}) {
    const user = await this.usersService.getUserByPhone(dto.phoneNumber);
    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }

    await this.verifyOtpCode(dto.phoneNumber, OtpType.PHONE_VERIFY, dto.code, context);
    await this.usersService.verifyPhone(getEntityId(user));

    return { message: 'phone verified' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByTarget(dto.email, dto.phoneNumber);

    if (user) {
      const target = dto.email ?? dto.phoneNumber;
      if (target) {
        await this.createOtpForTarget(
          getEntityId(user),
          target,
          OtpType.PASSWORD_RESET,
          this.passwordResetOtpExpiresMs,
        );
      }
    }

    return { message: 'password reset otp sent if account exists' };
  }

  async resetPassword(dto: ResetPasswordDto, context: AuthContext = {}) {
    const user = await this.findUserByTarget(dto.email, dto.phoneNumber);
    const target = dto.email ?? dto.phoneNumber;

    if (!user || !target) {
      throw new BadRequestException('Invalid password reset request');
    }

    await this.verifyOtpCode(target, OtpType.PASSWORD_RESET, dto.code, context);

    const userId = getEntityId(user);
    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);
    await this.usersService.updatePasswordAndIncrementTokenVersion(
      userId,
      passwordHash,
    );
    await this.sessionRepository.revokeAllUserSessions(userId);
    await this.refreshTokenRepository.revokeAllUserTokens(userId);

    await this.logSecurityEvent(AuditAction.PASSWORD_CHANGED, userId, {
      ...context,
      deviceId: context.deviceId,
    });

    return { message: 'password reset successful' };
  }

  async login(dto: LoginDto, context: AuthContext = {}) {
    const user = await this.findLoginUser(dto);

    if (!user || !user.passwordHash) {
      await this.logSecurityEvent(AuditAction.LOGIN_FAILED, null, {
        ...context,
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = getEntityId(user);

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logSecurityEvent(AuditAction.LOGIN_FAILED, userId, {
        ...context,
        deviceId: dto.deviceId,
      });
      throw new ForbiddenException('Account is temporarily locked');
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Account verification is required');
    }

    const passwordMatches = await this.passwordService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.handleFailedLogin(userId, dto.deviceId, context);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.resetLoginSecurity(userId);

    const oldSession = await this.sessionRepository.findActiveSession(
      userId,
      dto.deviceId,
    );

    if (oldSession) {
      await this.sessionRepository.revokeSession(getEntityId(oldSession));
      const oldRefreshToken = await this.refreshTokenRepository.findActiveToken(
        userId,
        dto.deviceId,
      );
      if (oldRefreshToken) {
        await this.refreshTokenRepository.revokeToken(
          getEntityId(oldRefreshToken),
        );
      }
    }

    const refreshExpiresAt = this.getRefreshTokenExpiryDate();
    const session = await this.sessionRepository.create({
      userId: new Types.ObjectId(userId),
      deviceId: dto.deviceId,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      lastActiveAt: new Date(),
      expiresAt: refreshExpiresAt,
    });

    const tokens = await this.issueTokenPair(user, getEntityId(session), dto.deviceId);

    await this.refreshTokenRepository.create({
      userId: new Types.ObjectId(userId),
      sessionId: new Types.ObjectId(getEntityId(session)),
      deviceId: dto.deviceId,
      tokenHash: this.tokenHashService.hashToken(tokens.refreshToken),
      tokenVersion: user.tokenVersion ?? 1,
      jti: this.tokenService.verifyRefreshToken(tokens.refreshToken).jti,
      tokenFamilyId: randomUUID(),
      expiresAt: refreshExpiresAt,
    });

    await this.logSecurityEvent(AuditAction.LOGIN_SUCCESS, userId, {
      ...context,
      deviceId: dto.deviceId,
    });

    return tokens;
  }

  async refreshToken(rawRefreshToken: string, context: AuthContext = {}): Promise<AuthTokens> {
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    const refreshTokenHash = this.tokenHashService.hashToken(rawRefreshToken);
    const storedRefreshToken = await this.refreshTokenRepository.findByTokenHash(
      refreshTokenHash,
    );

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
    const refreshToken = this.tokenService.generateRefreshToken(rotatedRefreshPayload);

    const newRefreshToken = await this.refreshTokenRepository.create({
      userId: new Types.ObjectId(payload.sub),
      sessionId: new Types.ObjectId(payload.sessionId),
      deviceId: payload.deviceId,
      tokenHash: this.tokenHashService.hashToken(refreshToken),
      tokenVersion: payload.tokenVersion,
      jti: rotatedRefreshPayload.jti,
      tokenFamilyId: storedRefreshToken.tokenFamilyId,
      expiresAt: refreshExpiresAt,
    });

    await this.refreshTokenRepository.revokeToken(
      getEntityId(storedRefreshToken),
      getEntityId(newRefreshToken),
    );

    await this.sessionRepository.updateLastActive(payload.sessionId);
    await this.logSecurityEvent(AuditAction.TOKEN_REFRESH, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string, context: AuthContext = {}) {
    let payload: JwtPayload | null = null;

    try {
      payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      payload = this.tokenService.decodeToken(rawRefreshToken);
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = this.tokenHashService.hashToken(rawRefreshToken);
    const storedRefreshToken = await this.refreshTokenRepository.findByTokenHash(
      refreshTokenHash,
    );

    if (storedRefreshToken) {
      await this.refreshTokenRepository.revokeToken(
        getEntityId(storedRefreshToken),
      );
    }

    const session = await this.sessionRepository.findByUserAndDevice(
      payload.sub,
      payload.deviceId,
    );

    if (session) {
      await this.sessionRepository.revokeSession(getEntityId(session));
    }

    await this.logSecurityEvent(AuditAction.LOGOUT, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });

    return { message: 'logout successful' };
  }

  async verifyOtp(dto: VerifyOtpDto, context: AuthContext = {}) {
    await this.verifyOtpCode(dto.target, dto.type, dto.code, context);
    return { message: 'otp verified' };
  }

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
    await this.sessionRepository.revokeAllUserSessions(userId);
    await this.refreshTokenRepository.revokeAllUserTokens(userId);
    await this.usersService.incrementTokenVersion(userId);
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

  private async findUserByTarget(
    email?: string,
    phoneNumber?: string,
  ) {
    if (email) {
      return this.usersService.getUserByEmail(email);
    }

    if (phoneNumber) {
      return this.usersService.getUserByPhone(phoneNumber);
    }

    return null;
  }

  private async createVerificationOtp(
    userId: string,
    target: string,
    type: OtpType.EMAIL_VERIFY | OtpType.PHONE_VERIFY,
  ): Promise<void> {
    await this.createOtpForTarget(
      userId,
      target,
      type,
      this.verificationOtpExpiresMs,
    );
  }

  private async createOtpForTarget(
    userId: string,
    target: string,
    type: OtpType,
    expiresInMs: number,
  ): Promise<void> {
    const isDevelopmentOtp = process.env.NODE_ENV === 'development';
    const code = isDevelopmentOtp ? '123456' : this.generateOtpCode();
    await this.otpRepository.create({
      userId: new Types.ObjectId(userId),
      target,
      type,
      codeHash: this.hashOtpCode(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + expiresInMs),
    });

    if (isDevelopmentOtp) {
      console.info(`Development OTP for ${target}: ${code}`);
    }

    const ttl = Math.ceil(expiresInMs / 1000);
    await this.redisService.set(this.getOtpAttemptsKey(target, type), '0', ttl);
    await this.redisService.delete(this.getOtpLockKey(target, type));

    if (isDevelopmentOtp) {
      return;
    }

    if (this.isEmailTarget(target)) {
      if (type === OtpType.PASSWORD_RESET) {
        await this.mailService.sendPasswordResetEmail(target, code);
        return;
      }

      await this.mailService.sendOtpEmail(target, code);
      return;
    }

    await this.smsIrService.sendOtpSms(target, code);
  }

  private async verifyOtpCode(
    target: string,
    type: OtpType,
    code: string,
    context: AuthContext,
  ): Promise<OtpCode> {
    const otp = await this.otpRepository.findLatestForVerification(target, type);

    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const otpId = getEntityId(otp);
    const now = new Date();
    const lockKey = this.getOtpLockKey(target, type);
    const attemptsKey = this.getOtpAttemptsKey(target, type);

    if ((await this.redisService.exists(lockKey)) || (otp.blockedUntil && otp.blockedUntil > now)) {
      throw new ForbiddenException('OTP is temporarily blocked');
    }

    if (otp.expiresAt <= now) {
      throw new BadRequestException('OTP expired');
    }

    const redisAttempts = await this.getRedisOtpAttempts(attemptsKey, otp.attempts);
    if (redisAttempts >= this.maxOtpAttempts || otp.attempts >= this.maxOtpAttempts) {
      await this.blockOtpValidation(otpId, lockKey);
      throw new ForbiddenException('OTP is temporarily blocked');
    }

    const expectedCode = this.hashOtpCode(code);

    if (otp.codeHash !== expectedCode) {
      const updatedOtp = await this.otpRepository.incrementAttempts(otpId);
      const updatedAttempts = await this.incrementRedisOtpAttempts(
        attemptsKey,
        redisAttempts,
        otp.expiresAt,
      );
      if ((updatedOtp?.attempts ?? otp.attempts + 1) >= this.maxOtpAttempts || updatedAttempts >= this.maxOtpAttempts) {
        await this.blockOtpValidation(otpId, lockKey);
      }
      throw new BadRequestException('Invalid OTP');
    }

    await this.redisService.delete(attemptsKey);
    await this.redisService.delete(lockKey);
    await this.otpRepository.markVerified(otpId);
    await this.logSecurityEvent(AuditAction.OTP_VERIFIED, getEntityId(otp.userId), {
      ...context,
      deviceId: context.deviceId,
    });

    return otp;
  }

  private async getRedisOtpAttempts(
    attemptsKey: string,
    fallbackAttempts: number,
  ): Promise<number> {
    const attempts = await this.redisService.get(attemptsKey);
    if (attempts === null) {
      return fallbackAttempts;
    }

    return Number(attempts);
  }

  private async incrementRedisOtpAttempts(
    attemptsKey: string,
    currentAttempts: number,
    expiresAt: Date,
  ): Promise<number> {
    const updatedAttempts = currentAttempts + 1;
    const ttl = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    await this.redisService.set(attemptsKey, updatedAttempts.toString(), ttl);
    return updatedAttempts;
  }

  private async blockOtpValidation(
    otpId: string,
    lockKey: string,
  ): Promise<void> {
    await this.redisService.set(lockKey, '1', Math.ceil(this.lockoutMs / 1000));
    await this.otpRepository.blockOtp(otpId, this.getLockoutDate());
  }

  private getOtpAttemptsKey(target: string, type: OtpType): string {
    return `otp:attempts:${target}:${type}`;
  }

  private getOtpLockKey(target: string, type: OtpType): string {
    return `otp:lockout:${target}:${type}`;
  }

  private isEmailTarget(target: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  }

  private async handleRefreshTokenReuse(
    storedRefreshToken: RefreshToken,
    payload: JwtPayload,
    context: AuthContext,
  ): Promise<void> {
    await this.refreshTokenRepository.markReuseDetected(
      getEntityId(storedRefreshToken),
    );
    await this.refreshTokenRepository.revokeTokenFamily(
      storedRefreshToken.tokenFamilyId,
    );
    await this.sessionRepository.revokeAllUserSessions(payload.sub);
    await this.usersService.incrementTokenVersion(payload.sub);
    await this.logSecurityEvent(AuditAction.ACCOUNT_LOCKED, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });
  }

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async findLoginUser(dto: LoginDto): Promise<UserWithId | null> {
    if (dto.email) {
      return this.usersService.getUserByEmailWithPassword(dto.email);
    }

    if (dto.phoneNumber) {
      return this.usersService.getUserByPhoneWithPassword(dto.phoneNumber);
    }

    return null;
  }

  private async handleFailedLogin(
    userId: string,
    deviceId: string,
    context: AuthContext,
  ): Promise<void> {
    const updatedUser = await this.usersService.incrementFailedLoginAttempts(userId);

    await this.logSecurityEvent(AuditAction.LOGIN_FAILED, userId, {
      ...context,
      deviceId,
    });

    if ((updatedUser?.failedLoginAttempts ?? 0) >= this.maxLoginAttempts) {
      await this.usersService.lockAccount(userId, this.getLockoutDate());
      await this.logSecurityEvent(AuditAction.ACCOUNT_LOCKED, userId, {
        ...context,
        deviceId,
      });
    }
  }

  private async issueTokenPair(
    user: UserWithId,
    sessionId: string,
    deviceId: string,
  ): Promise<AuthTokens> {
    const basePayload = {
      sub: getEntityId(user),
      role: user.role,
      sessionId,
      deviceId,
      tokenVersion: user.tokenVersion ?? 1,
    };

    const accessToken = this.tokenService.generateAccessToken({
      ...basePayload,
      jti: randomUUID(),
    });
    const refreshToken = this.tokenService.generateRefreshToken({
      ...basePayload,
      jti: randomUUID(),
    });

    return { accessToken, refreshToken };
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? '30d'));
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private getLockoutDate(): Date {
    return new Date(Date.now() + this.lockoutMs);
  }

  private hashOtpCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async logSecurityEvent(
    action: AuditAction,
    userId: string | null,
    context: AuthContext,
  ): Promise<void> {
    try {
      await this.auditLogRepository.create({
        userId: userId ? new Types.ObjectId(userId) : null,
        action,
        ipAddress: context.ipAddress ?? null,
        deviceId: context.deviceId ?? null,
        userAgent: context.userAgent ?? null,
      });
    } catch {
      // Audit logging must never break the authentication flow.
    }
  }

}
