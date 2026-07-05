import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { RefreshTokenService } from './refresh-token.service';
import { UsersService } from '../../users/services/users.service';
import { PasswordService } from '../../../infrastructure/security/password.service';
import { TokenService } from '../../../infrastructure/security/token.service';
import { TokenHashService } from '../../../infrastructure/security/token-hash.service';
import { AuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { MailService } from '../../mail/mail.service';
import { SmsIrService } from '../../mail/sms-ir.service';
import { OtpRepository } from '../repositories/otp.repository';
import { EventBusService } from '../../../core/events/event-bus.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { AccountStatus } from '../../users/enums/account-status.enum';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let otpService: OtpService;
  let passwordService: PasswordService;

  const mockUsersService = {
    emailExists: jest.fn(),
    phoneExists: jest.fn(),
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserByEmailWithPassword: jest.fn(),
    getUserById: jest.fn(),
    resetLoginSecurity: jest.fn(),
    incrementFailedLoginAttempts: jest.fn(),
  };

  const mockOtpService = {
    createVerificationOtp: jest.fn(),
    createPasswordResetOtp: jest.fn(),
    verifyOtpCode: jest.fn(),
  };

  const mockPasswordService = {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mockTokenHashService = {
    hashToken: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    findActiveSession: jest.fn(),
    revokeSession: jest.fn(),
    updateLastActive: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    findByTokenHash: jest.fn(),
    create: jest.fn(),
    revokeToken: jest.fn(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    setIfNotExists: jest.fn().mockResolvedValue(false),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
  };

  const mockEventBusService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: TokenHashService, useValue: mockTokenHashService },
        { provide: AuditLogRepository, useValue: mockAuditLogRepository },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MailService, useValue: {} },
        { provide: SmsIrService, useValue: {} },
        { provide: OtpRepository, useValue: {} },
        { provide: EventBusService, useValue: mockEventBusService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    otpService = module.get<OtpService>(OtpService);
    passwordService = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUsersService.emailExists.mockResolvedValue(false);
      mockUsersService.phoneExists.mockResolvedValue(false);
      mockPasswordService.hashPassword.mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue({
        _id: 'user123',
        email: 'test@example.com',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.PENDING,
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'StrongPass123!',
      });

      expect(result).toHaveProperty('message', 'verification otp sent');
      expect(mockOtpService.createVerificationOtp).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.emailExists.mockResolvedValue(true);

      await expect(
        service.register({ email: 'existing@example.com', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUsersService.getUserByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'wrong', deviceId: 'device-123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPasswordService.comparePassword).toHaveBeenCalledWith(
        'wrong',
        expect.stringMatching(/^\$2b\$12\$/),
      );
    });

    it('should not reveal pending accounts when password is wrong', async () => {
      mockUsersService.getUserByEmailWithPassword.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'pending@example.com',
        passwordHash: 'stored-hash',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.PENDING,
      });
      mockPasswordService.comparePassword.mockResolvedValue(false);
      mockUsersService.incrementFailedLoginAttempts.mockResolvedValue({ failedLoginAttempts: 1 });

      await expect(
        service.login({ email: 'pending@example.com', password: 'wrong', deviceId: 'device-123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset OTP if user exists', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({ _id: 'user123' });

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toHaveProperty('message');
      expect(mockOtpService.createPasswordResetOtp).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    const validPayload = {
      sub: '507f1f77bcf86cd799439011',
      role: 'CUSTOMER',
      sessionId: '507f1f77bcf86cd799439012',
      deviceId: 'device-1',
      tokenVersion: 1,
      jti: 'jti-1',
    };

    beforeEach(() => {
      mockTokenService.verifyRefreshToken.mockReturnValue(validPayload);
      mockTokenHashService.hashToken.mockReturnValue('hashed');
    });

    it('throws ConflictException when a rotation is already in progress', async () => {
      mockRedisService.setIfNotExists.mockResolvedValue(false);

      await expect(service.refreshToken('raw-token', {})).rejects.toThrow(
        ConflictException,
      );
      expect(mockRedisService.setIfNotExists).toHaveBeenCalledWith(
        'auth:refresh-rotate:hashed',
        '1',
        15,
      );
      // No reads / mints happen once the lock is contended.
      expect(mockRefreshTokenService.findByTokenHash).not.toHaveBeenCalled();
      expect(mockRedisService.delete).not.toHaveBeenCalled();
    });

    it('rotates and releases the lock on success', async () => {
      mockRedisService.setIfNotExists.mockResolvedValue(true);
      mockRefreshTokenService.findByTokenHash.mockResolvedValue({
        userId: 'user-1',
        sessionId: 'session-1',
        deviceId: 'device-1',
        tokenFamilyId: 'family-1',
        jti: 'jti-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockUsersService.getUserById.mockResolvedValue({
        _id: 'user-1',
        role: 'CUSTOMER',
        accountStatus: 'active',
        tokenVersion: 1,
      });
      mockTokenService.generateAccessToken.mockReturnValue('new-access');
      mockTokenService.generateRefreshToken.mockReturnValue('new-refresh');
      mockRefreshTokenService.create.mockResolvedValue({ _id: 'new-rt' });
      mockRefreshTokenService.revokeToken.mockResolvedValue(undefined);
      mockSessionService.updateLastActive.mockResolvedValue(undefined);

      const result = await service.refreshToken('raw-token', {});

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      expect(mockRedisService.delete).toHaveBeenCalledWith(
        'auth:refresh-rotate:hashed',
      );
    });
  });
});