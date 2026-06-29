import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { SessionRepository } from '../repositories/session.repository';
import { TokenService } from '../../../infrastructure/security/token.service';
import { TokenHashService } from '../../../infrastructure/security/token-hash.service';
import { UsersService } from '../../users/services/users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: RefreshTokenRepository;

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    markReuseDetected: jest.fn(),
    revokeTokenFamily: jest.fn(),
  };

  const mockSessionRepository = {
    updateLastActive: jest.fn(),
    revokeAllUserSessions: jest.fn(),
  };

  const mockTokenService = {
    verifyRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };

  const mockTokenHashService = {
    hashToken: jest.fn(),
  };

  const mockUsersService = {
    getUserById: jest.fn(),
    incrementTokenVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: RefreshTokenRepository, useValue: mockRefreshTokenRepository },
        { provide: SessionRepository, useValue: mockSessionRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: TokenHashService, useValue: mockTokenHashService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get<RefreshTokenRepository>(RefreshTokenRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedException on invalid refresh token', async () => {
    mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      service.refreshAccessToken('invalid-token'),
    ).rejects.toThrow(UnauthorizedException);
  });
});