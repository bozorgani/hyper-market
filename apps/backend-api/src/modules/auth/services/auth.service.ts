import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { EventBusService } from '../../../core/events/event-bus.service';
import { EventType } from '../../../core/events/enums/event-type.enum';
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
import { RefreshToken } from '../schemas/refresh-token.schema';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { RefreshTokenService } from './refresh-token.service';

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

// A valid bcrypt hash used only to equalize timing for unknown accounts.
// It is intentionally not a real user password and comparePassword() will
// still apply the runtime pepper before bcrypt verification.
const DUMMY_PASSWORD_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8BzzhLQjCjULVxYHK4QBVpLw3C6l9W';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutMs = 15 * 60 * 1000;
  private readonly maxOtpAttempts = 5;
  private readonly verificationOtpExpiresMs = 10 * 60 * 1000;
  private readonly passwordResetOtpExpiresMs = 10 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly otpRepository: OtpRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tokenHashService: TokenHashService,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly smsIrService: SmsIrService,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly eventBusService: EventBusService,
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
      await this.otpService.createVerificationOtp(userId, user.email, OtpType.EMAIL_VERIFY);
    }

    if (user.phoneNumber) {
      await this.otpService.createVerificationOtp(userId, user.phoneNumber, OtpType.PHONE_VERIFY);
    }

    this.eventBusService.emit({
      type: EventType.USER_REGISTERED,
      payload: {
        userId,
        role: user.role,
        hasEmail: Boolean(user.email),
        hasPhoneNumber: Boolean(user.phoneNumber),
      },
      timestamp: Date.now(),
    });

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
      await this.otpService.createVerificationOtp(userId, dto.email, OtpType.EMAIL_VERIFY);
    }

    if (dto.phoneNumber) {
      await this.otpService.createVerificationOtp(userId, dto.phoneNumber, OtpType.PHONE_VERIFY);
    }

    return { message: 'verification otp sent' };
  }

  async verifyEmail(dto: VerifyEmailDto, context: AuthContext = {}) {
    const user = await this.usersService.getUserByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }

    await this.otpService.verifyOtpCode(dto.email, OtpType.EMAIL_VERIFY, dto.code, context);
    await this.usersService.verifyEmail(getEntityId(user));

    return { message: 'email verified' };
  }

  async verifyPhone(dto: VerifyPhoneDto, context: AuthContext = {}) {
    const user = await this.usersService.getUserByPhone(dto.phoneNumber);
    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }

    await this.otpService.verifyOtpCode(dto.phoneNumber, OtpType.PHONE_VERIFY, dto.code, context);
    await this.usersService.verifyPhone(getEntityId(user));

    return { message: 'phone verified' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByTarget(dto.email, dto.phoneNumber);

    if (user) {
      const target = dto.email ?? dto.phoneNumber;
      if (target) {
        await this.otpService.createPasswordResetOtp(
          getEntityId(user),
          target,
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

    await this.otpService.verifyOtpCode(target, OtpType.PASSWORD_RESET, dto.code, context);

    const userId = getEntityId(user);
    const passwordHash = await this.passwordService.hashPassword(dto.newPassword);
    await this.usersService.updatePasswordAndIncrementTokenVersion(
      userId,
      passwordHash,
    );
    await this.sessionService.revokeAllUserSessions(userId);
    await this.refreshTokenService.revokeAllUserTokens(userId);

    await this.logSecurityEvent(AuditAction.PASSWORD_CHANGED, userId, {
      ...context,
      deviceId: context.deviceId,
    });

    return { message: 'password reset successful' };
  }

  async login(dto: LoginDto, context: AuthContext = {}) {
    const user = await this.findLoginUser(dto);

    if (!user || !user.passwordHash) {
      await this.compareAgainstDummyPassword(dto.password);
      await this.logSecurityEvent(AuditAction.LOGIN_FAILED, null, {
        ...context,
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const userId = getEntityId(user);

    const passwordMatches = await this.passwordService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await this.handleFailedLogin(userId, dto.deviceId, context);
      throw new UnauthorizedException('Invalid credentials');
    }

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

    await this.usersService.resetLoginSecurity(userId);

    const oldSession = await this.sessionService.findActiveSession(
      userId,
      dto.deviceId,
    );

    if (oldSession) {
      await this.sessionService.revokeSession(getEntityId(oldSession));
      const oldRefreshToken = await this.refreshTokenService.findActiveToken(
        userId,
        dto.deviceId,
      );
      if (oldRefreshToken) {
        await this.refreshTokenService.revokeToken(
          getEntityId(oldRefreshToken),
        );
      }
    }

    const refreshExpiresAt = this.getRefreshTokenExpiryDate();
    const session = await this.sessionService.create({
      userId: userId,
      deviceId: dto.deviceId,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt: refreshExpiresAt,
    });

    const tokens = await this.issueTokenPair(user, getEntityId(session), dto.deviceId);

    await this.refreshTokenService.create({
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
    // Signature/structure check only — cheap, no shared state.
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    const refreshTokenHash = this.tokenHashService.hashToken(rawRefreshToken);

    // Serialize rotation for the same token to prevent a race where two
    // concurrent requests (e.g. multiple tabs sharing one refresh token)
    // both pass validation and each mint a brand-new refresh token, leaving
    // two valid tokens in the same family. If Redis is unavailable we
    // fail-open (proceed without the lock) to preserve availability.
    const lockKey = `auth:refresh-rotate:${refreshTokenHash}`;
    let lockAcquired = false;
    try {
      lockAcquired = await this.redisService.setIfNotExists(lockKey, '1', 15);
    } catch {
      lockAcquired = true;
    }

    if (!lockAcquired) {
      throw new ConflictException('Refresh already in progress, please retry');
    }

    try {
      const storedRefreshToken = await this.refreshTokenService.findByTokenHash(
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

    const newRefreshToken = await this.refreshTokenService.create({
      userId: new Types.ObjectId(payload.sub),
      sessionId: new Types.ObjectId(payload.sessionId),
      deviceId: payload.deviceId,
      tokenHash: this.tokenHashService.hashToken(refreshToken),
      tokenVersion: payload.tokenVersion,
      jti: rotatedRefreshPayload.jti,
      tokenFamilyId: storedRefreshToken.tokenFamilyId,
      expiresAt: refreshExpiresAt,
    });

    await this.refreshTokenService.revokeToken(
      getEntityId(storedRefreshToken),
      getEntityId(newRefreshToken),
    );

    await this.sessionService.updateLastActive(payload.sessionId);
    await this.logSecurityEvent(AuditAction.TOKEN_REFRESH, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });

    return { accessToken, refreshToken };
    } finally {
      await this.redisService.delete(lockKey).catch(() => undefined);
    }
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
    const storedRefreshToken = await this.refreshTokenService.findByTokenHash(
      refreshTokenHash,
    );

    if (storedRefreshToken) {
      await this.refreshTokenService.revokeToken(
        getEntityId(storedRefreshToken),
      );
    }

    const session = await this.sessionService.findByUserAndDevice(
      payload.sub,
      payload.deviceId,
    );

    if (session) {
      await this.sessionService.revokeSession(getEntityId(session));
    }

    await this.logSecurityEvent(AuditAction.LOGOUT, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });

    return { message: 'logout successful' };
  }

  async verifyOtp(dto: VerifyOtpDto, context: AuthContext = {}) {
    await this.otpService.verifyOtpCode(dto.target, dto.type, dto.code, context);
    return { message: 'otp verified' };
  }


  async getCurrentUser(payload: JwtPayload) {
    const user = await this.usersService.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userId = getEntityId(user);

    return {
      _id: userId,
      id: userId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      accountStatus: user.accountStatus,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
    };
  }

  async findUserByEmail(email: string) {
    return this.usersService.getUserByEmail(email);
  }

  // NOTE: The following methods have been deprecated.
  // Use OtpService, SessionService, or RefreshTokenService directly instead.
  // These wrappers will be removed in a future version.

  private async compareAgainstDummyPassword(password: string): Promise<void> {
    try {
      await this.passwordService.comparePassword(password, DUMMY_PASSWORD_HASH);
    } catch {
      // Timing equalization is best-effort and must not change auth semantics.
    }
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
  }

  private async handleRefreshTokenReuse(
    storedRefreshToken: RefreshToken,
    payload: JwtPayload,
    context: AuthContext,
  ): Promise<void> {
    await this.refreshTokenService.markReuseDetected(
      getEntityId(storedRefreshToken),
    );
    await this.refreshTokenService.revokeTokenFamily(
      storedRefreshToken.tokenFamilyId,
    );
    await this.sessionService.revokeAllUserSessions(payload.sub);
    await this.usersService.incrementTokenVersion(payload.sub);
    await this.logSecurityEvent(AuditAction.ACCOUNT_LOCKED, payload.sub, {
      ...context,
      deviceId: payload.deviceId,
    });
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
    } catch (error) {
      // Audit logging must never break the authentication flow.
    }
  }
}
