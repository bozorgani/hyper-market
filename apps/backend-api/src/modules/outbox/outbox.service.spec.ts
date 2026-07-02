import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { OutboxRepository } from './repositories/outbox.repository';

describe('OutboxService', () => {
  let service: OutboxService;
  const mockRepository = {
    savePending: jest.fn().mockResolvedValue(undefined),
    markDispatched: jest.fn().mockResolvedValue(undefined),
    incrementAttempts: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    findPendingOlderThan: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: OutboxRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    jest.clearAllMocks();
  });

  it('computeDedupeKey is deterministic and ignores timestamp', () => {
    const a = OutboxService.computeDedupeKey({
      type: 'ORDER_CREATED',
      payload: { orderId: '1' },
      timestamp: 100,
    });
    const b = OutboxService.computeDedupeKey({
      type: 'ORDER_CREATED',
      payload: { orderId: '1' },
      timestamp: 999,
    });
    const c = OutboxService.computeDedupeKey({
      type: 'ORDER_CREATED',
      payload: { orderId: '2' },
      timestamp: 100,
    });

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('persist writes a pending row with the computed dedupe key', async () => {
    const event = { type: 'ORDER_PAID', payload: { id: '1' }, timestamp: 5 };
    const key = await service.persist(event);

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(mockRepository.savePending).toHaveBeenCalledWith({
      type: 'ORDER_PAID',
      payload: { id: '1' },
      timestamp: 5,
      dedupeKey: key,
    });
  });

  it('delegates confirm/retry/dead-letter to the repository', async () => {
    await service.markDispatched('k1');
    await service.incrementAttempts('k2');
    await service.markFailed('k3', 'boom');

    expect(mockRepository.markDispatched).toHaveBeenCalledWith('k1');
    expect(mockRepository.incrementAttempts).toHaveBeenCalledWith('k2');
    expect(mockRepository.markFailed).toHaveBeenCalledWith('k3', 'boom');
  });
});
