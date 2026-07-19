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

  it('should detect refresh token reuse and revoke token family', async () => {
    mockTokenService.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      role: 'CUSTOMER',
      sessionId: 'session-1',
      deviceId: 'device-1',
      tokenVersion: 1,
      jti: 'jti-1',
    });
    mockTokenHashService.hashToken.mockReturnValue('hash-1');

    const reusedToken = {
      _id: 'token-1',
      userId: 'user-1',
      sessionId: 'session-1',
      tokenHash: 'hash-1',
      tokenFamilyId: 'family-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      tokenVersion: 1,
      reuseDetected: false,
    };

    mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(reusedToken);
    mockUsersService.getUserById.mockResolvedValue({ tokenVersion: 1, sub: 'user-1', role: 'CUSTOMER' });

    await expect(
      service.refreshAccessToken('reused-token'),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockRefreshTokenRepository.markReuseDetected).toHaveBeenCalledWith('token-1');
    expect(mockRefreshTokenRepository.revokeTokenFamily).toHaveBeenCalledWith('family-1');
    expect(mockSessionRepository.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    expect(mockUsersService.incrementTokenVersion).toHaveBeenCalledWith('user-1');
  });

  it('should reject refresh token after family revocation', async () => {
    mockTokenService.verifyRefreshToken.mockReturnValue({
      sub: 'user-2',
      role: 'CUSTOMER',
      sessionId: 'session-2',
      deviceId: 'device-2',
      tokenVersion: 2,
      jti: 'jti-2',
    });
    mockTokenHashService.hashToken.mockReturnValue('hash-2');

    const revokedFamilyToken = {
      _id: 'token-2',
      userId: 'user-2',
      sessionId: 'session-2',
      tokenHash: 'hash-2',
      tokenFamilyId: 'family-2',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      tokenVersion: 2,
      reuseDetected: false,
    };

    mockRefreshTokenRepository.findByTokenHash.mockResolvedValue(revokedFamilyToken);

    await expect(
      service.refreshAccessToken('revoked-token'),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockRefreshTokenRepository.markReuseDetected).toHaveBeenCalledWith('token-2');
    expect(mockRefreshTokenRepository.revokeTokenFamily).toHaveBeenCalledWith('family-2');
  });
});