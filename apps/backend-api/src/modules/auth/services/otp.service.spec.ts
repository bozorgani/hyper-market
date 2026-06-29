import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { OtpService } from './otp.service';
import { OtpRepository } from '../repositories/otp.repository';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { MailService } from '../../mail/mail.service';
import { SmsIrService } from '../../mail/sms-ir.service';
import { OtpType } from '../enums/otp-type.enum';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OtpService', () => {
  let service: OtpService;
  let otpRepository: OtpRepository;
  let redisService: RedisService;

  const mockOtpRepository = {
    create: jest.fn(),
    findLatestForVerification: jest.fn(),
    incrementAttempts: jest.fn(),
    markVerified: jest.fn(),
    blockOtp: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  const mockMailService = {
    sendOtpEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockSmsService = {
    sendOtpSms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: OtpRepository, useValue: mockOtpRepository },
        { provide: RedisService, useValue: mockRedisService },
        { provide: MailService, useValue: mockMailService },
        { provide: SmsIrService, useValue: mockSmsService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    otpRepository = module.get<OtpRepository>(OtpRepository);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVerificationOtp', () => {
  it('should create an OTP and store attempts in Redis', async () => {
    mockOtpRepository.create.mockResolvedValue({});
    mockRedisService.set.mockResolvedValue('OK');

    // Use a valid 24-char hex string for userId
    const validUserId = '507f1f77bcf86cd799439011';

    await service.createVerificationOtp(validUserId, 'test@example.com', OtpType.EMAIL_VERIFY);

    expect(mockOtpRepository.create).toHaveBeenCalled();
    expect(mockRedisService.set).toHaveBeenCalled();
  });
  });

  describe('verifyOtpCode', () => {
    it('should throw BadRequestException for invalid OTP', async () => {
      mockOtpRepository.findLatestForVerification.mockResolvedValue(null);

      await expect(
        service.verifyOtpCode('test@example.com', OtpType.EMAIL_VERIFY, '123456', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when OTP is blocked', async () => {
      mockOtpRepository.findLatestForVerification.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 100000),
      });
      mockRedisService.exists.mockResolvedValue(0);

      await expect(
        service.verifyOtpCode('test@example.com', OtpType.EMAIL_VERIFY, '123456', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});