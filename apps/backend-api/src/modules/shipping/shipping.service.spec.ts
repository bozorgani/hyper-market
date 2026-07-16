import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingMethod } from './enums/shipping-method.enum';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShippingService],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    // Clear any custom config in process.env
    delete process.env.SHIPPING_CONFIG_JSON;
    delete process.env.SHIPPING_FREE_THRESHOLD;
  });

  afterEach(() => {
    delete process.env.SHIPPING_CONFIG_JSON;
    delete process.env.SHIPPING_FREE_THRESHOLD;
  });

  describe('getQuote', () => {
    it('should successfully calculate standard shipping fee when subtotal is below threshold', () => {
      const result = service.getQuote({
        province: 'Tehran',
        city: 'Tehran',
        subtotal: 500_000,
        deliveryDate: new Date('2026-07-20'),
        timeSlot: '09:00-12:00',
        method: ShippingMethod.STANDARD,
      });

      expect(result.deliveryFee).toBe(50_000);
      expect(result.freeShippingApplied).toBe(false);
      expect(result.capacity).toBe(50);
    });

    it('should apply free shipping when subtotal is above threshold', () => {
      const result = service.getQuote({
        province: 'Tehran',
        city: 'Tehran',
        subtotal: 1_200_000,
        deliveryDate: new Date('2026-07-20'),
        timeSlot: '09:00-12:00',
        method: ShippingMethod.STANDARD,
      });

      expect(result.deliveryFee).toBe(0);
      expect(result.freeShippingApplied).toBe(true);
    });

    it('should throw BadRequestException for missing province or city', () => {
      expect(() =>
        service.getQuote({
          province: '',
          city: '',
          subtotal: 200_000,
          deliveryDate: new Date(),
          timeSlot: '09:00-12:00',
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if selected delivery window is blocked/unavailable', () => {
      // Set unavailable window via config env
      process.env.SHIPPING_CONFIG_JSON = JSON.stringify({
        unavailableWindows: [
          {
            date: '2026-07-20',
            timeSlot: '09:00-12:00',
            province: 'Tehran',
            city: 'Tehran',
          },
        ],
      });

      expect(() =>
        service.getQuote({
          province: 'Tehran',
          city: 'Tehran',
          subtotal: 500_000,
          deliveryDate: new Date('2026-07-20T00:00:00.000Z'),
          timeSlot: '09:00-12:00',
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if city is not supported when supportedLocations is defined', () => {
      process.env.SHIPPING_CONFIG_JSON = JSON.stringify({
        supportedLocations: {
          Tehran: ['Tehran', 'Ray'],
        },
      });

      expect(() =>
        service.getQuote({
          province: 'Tehran',
          city: 'Shiraz',
          subtotal: 500_000,
          deliveryDate: new Date(),
          timeSlot: '09:00-12:00',
        }),
      ).toThrow(BadRequestException);
    });
  });
});
