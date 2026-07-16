import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { EventBusService } from '../../core/events/event-bus.service';
import { MEILISEARCH_CLIENT } from './meilisearch-client.provider';

describe('SearchService', () => {
  let service: SearchService;
  let mockEventBusService: {
    emit: jest.Mock;
  };
  let mockMeiliIndex: {
    search: jest.Mock;
  };
  let mockMeiliClient: {
    index: jest.Mock;
  };

  beforeEach(async () => {
    mockEventBusService = {
      emit: jest.fn(),
    };

    mockMeiliIndex = {
      search: jest.fn().mockResolvedValue({
        hits: [
          {
            id: 'prod-123',
            title: 'Samsung Galaxy S24',
            price: 1000,
            stock: 10,
            isActive: true,
          },
        ],
        totalHits: 1,
        facetDistribution: {
          categoryName: { Phone: 1 },
          brand: { Samsung: 1 },
          tags: {},
        },
      }),
    };

    mockMeiliClient = {
      index: jest.fn().mockReturnValue(mockMeiliIndex),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: EventBusService, useValue: mockEventBusService },
        { provide: MEILISEARCH_CLIENT, useValue: mockMeiliClient },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('searchProducts', () => {
    it('should successfully search products with active filter and emit event', async () => {
      const result = await service.searchProducts('Samsung', { page: 1, limit: 10 });

      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe('Samsung Galaxy S24');
      expect(result.total).toBe(1);
      expect(mockMeiliClient.index).toHaveBeenCalledWith('products');
      expect(mockMeiliIndex.search).toHaveBeenCalledWith(
        'Samsung',
        expect.objectContaining({
          limit: 10,
          offset: 0,
          filter: ['isActive = true'],
        }),
      );
      expect(mockEventBusService.emit).toHaveBeenCalled();
    });

    it('should apply pagination and filters correctly', async () => {
      await service.searchProducts('Samsung', {
        page: 2,
        limit: 5,
        categoryId: 'cat-456',
        minPrice: 100,
        maxPrice: 2000,
      });

      expect(mockMeiliIndex.search).toHaveBeenCalledWith(
        'Samsung',
        expect.objectContaining({
          limit: 5,
          offset: 5,
          filter: [
            'isActive = true',
            'categoryId = "cat-456"',
            'effectivePrice >= 100',
            'effectivePrice <= 2000',
          ],
        }),
      );
    });
  });

  describe('suggestProducts', () => {
    it('should return simplified suggestions for valid non-empty query', async () => {
      const result = await service.suggestProducts('Sam');

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        id: 'prod-123',
        title: 'Samsung Galaxy S24',
        price: 1000,
        stock: 10,
      });
    });

    it('should return empty list for empty query', async () => {
      const result = await service.suggestProducts(' ');
      expect(result).toEqual([]);
      expect(mockMeiliIndex.search).not.toHaveBeenCalled();
    });
  });
});
