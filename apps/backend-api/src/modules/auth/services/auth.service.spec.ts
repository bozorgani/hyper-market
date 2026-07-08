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
import { OtpType } from '../enums/otp-type.enum';
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
    lockAccount: jest.fn(),
    updatePasswordAndIncrementTokenVersion: jest.fn(),
    verifyEmail: jest.fn(),
    verifyPhone: jest.fn(),
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
    decodeToken: jest.fn(),
  };

  const mockTokenHashService = {
    hashToken: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    create: jest.fn(),
    findActiveSession: jest.fn(),
    findByUserAndDevice: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    updateLastActive: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    refreshAccessToken: jest.fn(),
    findByTokenHash: jest.fn(),
    create: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
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

    it('should throw ConflictException if a verified email exists', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'existing@example.com',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        isEmailVerified: true,
      });

      await expect(
        service.register({ email: 'existing@example.com', password: 'pass' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should resend verification OTP for pending unverified registration', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'pending@example.com',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.PENDING,
        isEmailVerified: false,
      });

      const result = await service.register({
        email: 'pending@example.com',
        password: 'StrongPass123!',
      });

      expect(result).toHaveProperty('message', 'verification otp sent');
      expect(mockOtpService.createVerificationOtp).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        'pending@example.com',
        expect.any(String),
      );
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
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

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        tokenVersion: 1,
        isEmailVerified: true,
      };

      mockUsersService.getUserByEmailWithPassword.mockResolvedValue(mockUser);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockUsersService.resetLoginSecurity.mockResolvedValue(undefined);
      mockSessionService.create.mockResolvedValue({ _id: '507f1f77bcf86cd799439012' });
      mockTokenService.generateAccessToken.mockReturnValue('access-token-123');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token-123');
      mockTokenService.verifyRefreshToken.mockReturnValue({ jti: 'jti-123' });
      mockRefreshTokenService.create.mockResolvedValue({ _id: 'rt-123' });

      const result = await service.login({
        email: 'test@example.com',
        password: 'StrongPass123!',
        deviceId: 'device-123',
      });

      expect(result).toHaveProperty('accessToken', 'access-token-123');
      expect(result).toHaveProperty('refreshToken', 'refresh-token-123');
      expect(mockSessionService.create).toHaveBeenCalled();
      expect(mockRefreshTokenService.create).toHaveBeenCalled();
    });

    it('should lock account after max failed attempts', async () => {
      mockUsersService.getUserByEmailWithPassword.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
      });
      mockPasswordService.comparePassword.mockResolvedValue(false);
      mockUsersService.incrementFailedLoginAttempts.mockResolvedValue({ 
        failedLoginAttempts: 5 
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong', deviceId: 'device-123' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.incrementFailedLoginAttempts).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset OTP if user exists', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({ _id: 'user123' });

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toHaveProperty('message');
      expect(mockOtpService.createPasswordResetOtp).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result).toHaveProperty('message');
      expect(mockOtpService.createPasswordResetOtp).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid OTP', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
      };

      mockUsersService.getUserByEmail.mockResolvedValue(mockUser);
      mockOtpService.verifyOtpCode.mockResolvedValue(undefined);
      mockPasswordService.hashPassword.mockResolvedValue('new_hashed_password');

      const result = await service.resetPassword({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'NewStrongPass123!',
      });

      expect(result).toHaveProperty('message');
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('NewStrongPass123!');
    });

    it('should throw error for invalid OTP', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue({ _id: 'user123' });
      mockOtpService.verifyOtpCode.mockRejectedValue(new Error('Invalid OTP'));

      await expect(
        service.resetPassword({
          email: 'test@example.com',
          code: '000000',
          newPassword: 'NewStrongPass123!',
        }),
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully and revoke tokens', async () => {
      const mockPayload = {
        sub: '507f1f77bcf86cd799439011',
        role: UserRole.CUSTOMER,
        sessionId: 'session-123',
        deviceId: 'device-123',
        tokenVersion: 1,
        jti: 'jti-123',
      };

      mockTokenService.verifyRefreshToken.mockReturnValue(mockPayload);
      mockTokenHashService.hashToken.mockReturnValue('hashed-token');
      mockRefreshTokenService.findByTokenHash.mockResolvedValue({
        _id: 'rt-123',
        tokenFamilyId: 'family-123',
      });
      mockRefreshTokenService.revokeToken.mockResolvedValue(undefined);
      mockSessionService.findByUserAndDevice.mockResolvedValue({
        _id: 'session-123',
      });
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      const result = await service.logout('valid-refresh-token', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        deviceId: 'device-123',
      });

      expect(result).toHaveProperty('message', 'logout successful');
      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalled();
      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-123');
    });

    it('should handle logout with invalid token gracefully', async () => {
      mockTokenService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockTokenService.decodeToken.mockReturnValue(null);

      await expect(
        service.logout('invalid-refresh-token', {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      mockOtpService.verifyOtpCode.mockResolvedValue(undefined);

      const result = await service.verifyOtp({
        target: 'test@example.com',
        type: OtpType.EMAIL_VERIFY,
        code: '123456',
      });

      expect(result).toHaveProperty('message', 'otp verified');
      expect(mockOtpService.verifyOtpCode).toHaveBeenCalledWith(
        'test@example.com',
        OtpType.EMAIL_VERIFY,
        '123456',
        {},
      );
    });

    it('should throw error for invalid OTP', async () => {
      mockOtpService.verifyOtpCode.mockRejectedValue(new Error('Invalid OTP'));

      await expect(
        service.verifyOtp({
          target: 'test@example.com',
          type: OtpType.EMAIL_VERIFY,
          code: '000000',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user data', async () => {
      const mockPayload = {
        sub: '507f1f77bcf86cd799439011',
        role: UserRole.CUSTOMER,
        sessionId: 'session-123',
        deviceId: 'device-123',
        tokenVersion: 1,
        jti: 'jti-123',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        phoneNumber: '09123456789',
        role: UserRole.CUSTOMER,
        accountStatus: AccountStatus.ACTIVE,
        isEmailVerified: true,
        isPhoneVerified: false,
      };

      mockUsersService.getUserById.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(mockPayload);

      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('role', UserRole.CUSTOMER);
      expect(result).toHaveProperty('sessionId', 'session-123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.getUserById.mockResolvedValue(null);

      await expect(
        service.getCurrentUser({
          sub: 'nonexistent',
          role: UserRole.CUSTOMER,
          sessionId: 'session-123',
          deviceId: 'device-123',
          tokenVersion: 1,
          jti: 'jti-123',
        }),
      ).rejects.toThrow(UnauthorizedException);
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