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
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  const mockAuditLogRepository = {
    create: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
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
});