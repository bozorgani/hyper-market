import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';
import { OutboxService } from '../../modules/outbox/outbox.service';
import { LoggerService } from '../../infrastructure/logger/logger.service';

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

describe('EventBusService (durable outbox)', () => {
  let service: EventBusService;
  const mockOutbox = {
    persist: jest.fn().mockResolvedValue('dedupe-key-123'),
    markDispatched: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    incrementAttempts: jest.fn().mockResolvedValue(undefined),
    findPendingOlderThan: jest.fn().mockResolvedValue([]),
  };
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: OutboxService, useValue: mockOutbox },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    jest.clearAllMocks();
  });

  it('persists, dispatches and confirms durable events', async () => {
    const listener = jest.fn();
    service.on('ORDER_CREATED', listener);

    service.emit({ type: 'ORDER_CREATED', payload: { orderId: '1' }, timestamp: 1 });
    await delay();

    expect(mockOutbox.persist).toHaveBeenCalledTimes(1);
    // Note: the event object is passed by reference and later gets `dedupeKey`
    // attached, so assert on shape rather than deep equality.
    const persisted = mockOutbox.persist.mock.calls[0][0];
    expect(persisted).toMatchObject({
      type: 'ORDER_CREATED',
      payload: { orderId: '1' },
      timestamp: 1,
    });

    // emit computes the dedupe key itself; persist()'s return value is ignored
    // because both sides must derive the identical deterministic key.
    const expectedKey = OutboxService.computeDedupeKey({
      type: 'ORDER_CREATED',
      payload: { orderId: '1' },
      timestamp: 1,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].dedupeKey).toBe(expectedKey);
    expect(mockOutbox.markDispatched).toHaveBeenCalledWith(expectedKey);
  });

  it('leaves a durable event PENDING when a listener throws (relay will retry)', async () => {
    const listener = jest.fn().mockRejectedValue(new Error('boom'));
    service.on('ORDER_PAID', listener);

    service.emit({ type: 'ORDER_PAID', payload: {}, timestamp: 2 });
    await delay();

    expect(mockOutbox.persist).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(mockOutbox.markDispatched).not.toHaveBeenCalled();
  });

  it('does not persist non-durable (high-frequency) events', async () => {
    const listener = jest.fn();
    service.on('SEARCH_PERFORMED', listener);

    service.emit({ type: 'SEARCH_PERFORMED', payload: { q: 'x' }, timestamp: 3 });
    await delay();

    expect(mockOutbox.persist).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(mockOutbox.markDispatched).not.toHaveBeenCalled();
  });

  it('redispatch re-runs listeners for recovery', async () => {
    const listener = jest.fn();
    service.on('USER_REGISTERED', listener);

    await service.redispatch({
      type: 'USER_REGISTERED',
      payload: { userId: '9' },
      timestamp: 4,
      dedupeKey: 'recovered-key',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].dedupeKey).toBe('recovered-key');
  });
});
