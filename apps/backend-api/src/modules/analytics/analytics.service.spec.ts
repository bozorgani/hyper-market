import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AnalyticsEventType } from './schemas/event.schema';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analyticsRepository: {
    create: jest.Mock;
    aggregate: jest.Mock;
    countDistinctUsers: jest.Mock;
    countByType: jest.Mock;
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    analyticsRepository = {
      create: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn().mockResolvedValue([]),
      countDistinctUsers: jest.fn().mockResolvedValue(0),
      countByType: jest.fn().mockResolvedValue(0),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: analyticsRepository },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── trackEvent ────────────────────────────────────────────────────
  describe('trackEvent', () => {
    it('should persist event to repository', () => {
      service.trackEvent({
        userId: 'user1',
        type: AnalyticsEventType.PRODUCT_VIEW,
        metadata: { productId: 'p1' },
      });

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          type: AnalyticsEventType.PRODUCT_VIEW,
          metadata: { productId: 'p1' },
        }),
      );
    });

    it('should invalidate dashboard cache after tracking', () => {
      service.trackEvent({ type: AnalyticsEventType.ADD_TO_CART });
      expect(redisService.delete).toHaveBeenCalledWith('analytics:dashboard');
    });

    it('should default null fields when not provided', () => {
      service.trackEvent({ type: AnalyticsEventType.LOGIN });

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          sessionId: null,
          deviceId: null,
          dedupeKey: null,
        }),
      );
    });
  });

  // ── trackPageView ─────────────────────────────────────────────────
  describe('trackPageView', () => {
    it('should track a PRODUCT_VIEW event', () => {
      service.trackPageView({ userId: 'u1', metadata: { productId: 'p1' } });

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: AnalyticsEventType.PRODUCT_VIEW }),
      );
    });
  });

  // ── trackSearch ───────────────────────────────────────────────────
  describe('trackSearch', () => {
    it('should track a SEARCH_QUERY event with query and resultsCount', () => {
      service.trackSearch({ userId: 'u1', query: 'گوشی', resultsCount: 5 });

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AnalyticsEventType.SEARCH_QUERY,
          metadata: expect.objectContaining({ query: 'گوشی', resultsCount: 5 }),
        }),
      );
    });
  });

  // ── trackPurchase ─────────────────────────────────────────────────
  describe('trackPurchase', () => {
    it('should track a PAYMENT_SUCCESS event with orderId and amount', () => {
      service.trackPurchase({ userId: 'u1', orderId: 'o1', amount: 500000 });

      expect(analyticsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AnalyticsEventType.PAYMENT_SUCCESS,
          metadata: expect.objectContaining({ orderId: 'o1', amount: 500000 }),
        }),
      );
    });
  });

  // ── getDashboard ──────────────────────────────────────────────────
  describe('getDashboard', () => {
    it('should return cached dashboard when available', async () => {
      const cached = {
        eventCounts: [],
        activeUsers: 10,
        revenue: {},
        products: {},
        search: {},
        funnel: {},
      };
      redisService.get.mockResolvedValue(cached);

      const result = await service.getDashboard();
      expect(result).toEqual(cached);
      expect(analyticsRepository.countDistinctUsers).not.toHaveBeenCalled();
    });

    it('should compute dashboard from DB when no cache', async () => {
      analyticsRepository.countDistinctUsers.mockResolvedValue(42);

      const result = await service.getDashboard();
      expect(result.activeUsers).toBe(42);
      expect(redisService.set).toHaveBeenCalledWith(
        'analytics:dashboard',
        expect.any(Object),
        300,
      );
    });

    it('should not fail when cache write fails', async () => {
      analyticsRepository.countDistinctUsers.mockResolvedValue(5);
      redisService.set.mockRejectedValue(new Error('Redis down'));

      const result = await service.getDashboard();
      expect(result).toBeDefined();
    });
  });

  // ── getFunnelMetrics ──────────────────────────────────────────────
  describe('getFunnelMetrics', () => {
    it('should return funnel steps with counts', async () => {
      analyticsRepository.countByType
        .mockResolvedValueOnce(100) // PRODUCT_VIEW
        .mockResolvedValueOnce(50)  // ADD_TO_CART
        .mockResolvedValueOnce(30)  // CHECKOUT_START
        .mockResolvedValueOnce(20); // PAYMENT_SUCCESS

      const result = await service.getFunnelMetrics();
      expect(result.productViews).toBe(100);
      expect(result.addToCart).toBe(50);
      expect(result.checkoutStarts).toBe(30);
      expect(result.paymentSuccess).toBe(20);
      expect(result.steps).toHaveLength(4);
    });
  });
});
