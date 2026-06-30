import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { SessionRepository } from '../repositories/session.repository';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: SessionRepository;

  const mockSessionRepository = {
    create: jest.fn(),
    findActiveSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    updateLastActive: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionRepository, useValue: mockSessionRepository },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get<SessionRepository>(SessionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a session', async () => {
    mockSessionRepository.create.mockResolvedValue({ _id: 'session123' });

    const result = await service.createSession({
      userId: '507f1f77bcf86cd799439011',
      expiresAt: new Date(),
    });

    expect(result).toHaveProperty('_id');
    expect(mockSessionRepository.create).toHaveBeenCalled();
  });

  it('should revoke all user sessions', async () => {
    await service.revokeAllUserSessions('user123');
    expect(mockSessionRepository.revokeAllUserSessions).toHaveBeenCalledWith('user123');
  });
});