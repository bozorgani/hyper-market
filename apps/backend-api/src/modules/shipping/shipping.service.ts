import { BadRequestException, Injectable } from '@nestjs/common';
import { ShippingMethod } from './enums/shipping-method.enum';

export type ShippingQuoteInput = {
  province: string;
  city: string;
  subtotal: number;
  deliveryDate: Date;
  timeSlot: string;
  method?: ShippingMethod;
};

export type ShippingQuote = {
  method: ShippingMethod;
  deliveryFee: number;
  freeShippingApplied: boolean;
  freeShippingThreshold: number;
  capacity: number;
  province: string;
  city: string;
  timeSlot: string;
  deliveryDate: string;
};

type ShippingConfig = {
  freeShippingThreshold: number;
  methods: Record<ShippingMethod, { fee: number; active: boolean }>;
  supportedLocations?: Record<string, string[]>;
  unavailableWindows?: Array<{
    date: string;
    timeSlot: string;
    province?: string;
    city?: string;
    method?: ShippingMethod;
  }>;
  defaultCapacityPerWindow: number;
  capacityByCity?: Record<string, number>;
};

const DEFAULT_CONFIG: ShippingConfig = {
  freeShippingThreshold: 1_000_000,
  methods: {
    [ShippingMethod.STANDARD]: { fee: 50_000, active: true },
    [ShippingMethod.EXPRESS]: { fee: 100_000, active: true },
  },
  defaultCapacityPerWindow: 50,
};

@Injectable()
export class ShippingService {
  getQuote(input: ShippingQuoteInput): ShippingQuote {
    const config = this.getConfig();
    const province = input.province.trim();
    const city = input.city.trim();
    const method = input.method ?? ShippingMethod.STANDARD;
    const methodConfig = config.methods[method];

    if (!methodConfig?.active) {
      throw new BadRequestException('Shipping method is not available');
    }

    this.assertSupportedLocation(config, province, city);
    this.assertDeliveryWindowAvailable(config, input.deliveryDate, input.timeSlot, province, city, method);

    const freeShippingApplied = input.subtotal >= config.freeShippingThreshold;
    const deliveryFee = freeShippingApplied ? 0 : methodConfig.fee;

    return {
      method,
      deliveryFee,
      freeShippingApplied,
      freeShippingThreshold: config.freeShippingThreshold,
      capacity: this.getCapacity(config, province, city),
      province,
      city,
      timeSlot: input.timeSlot,
      deliveryDate: this.toDateKey(input.deliveryDate),
    };
  }

  getCapacityForWindow(province: string, city: string): number {
    return this.getCapacity(this.getConfig(), province.trim(), city.trim());
  }

  private assertSupportedLocation(config: ShippingConfig, province: string, city: string): void {
    if (!province || !city) {
      throw new BadRequestException('Shipping province and city are required');
    }

    if (!config.supportedLocations || Object.keys(config.supportedLocations).length === 0) {
      return;
    }

    const supportedCities = config.supportedLocations[province];
    if (!supportedCities?.includes(city)) {
      throw new BadRequestException('Shipping is not available for this city');
    }
  }

  private assertDeliveryWindowAvailable(
    config: ShippingConfig,
    date: Date,
    timeSlot: string,
    province: string,
    city: string,
    method: ShippingMethod,
  ): void {
    const dateKey = this.toDateKey(date);
    const blocked = config.unavailableWindows?.some((window) =>
      window.date === dateKey &&
      window.timeSlot === timeSlot &&
      (!window.province || window.province === province) &&
      (!window.city || window.city === city) &&
      (!window.method || window.method === method),
    );

    if (blocked) {
      throw new BadRequestException('Selected delivery window is unavailable');
    }
  }

  private getCapacity(config: ShippingConfig, province: string, city: string): number {
    return (
      config.capacityByCity?.[`${province}:${city}`] ??
      config.capacityByCity?.[city] ??
      config.defaultCapacityPerWindow
    );
  }

  private getConfig(): ShippingConfig {
    const raw = process.env.SHIPPING_CONFIG_JSON;
    if (!raw) {
      return {
        ...DEFAULT_CONFIG,
        freeShippingThreshold: Number(process.env.SHIPPING_FREE_THRESHOLD ?? DEFAULT_CONFIG.freeShippingThreshold),
        defaultCapacityPerWindow: Number(process.env.SHIPPING_DEFAULT_CAPACITY_PER_WINDOW ?? DEFAULT_CONFIG.defaultCapacityPerWindow),
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ShippingConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        methods: {
          ...DEFAULT_CONFIG.methods,
          ...(parsed.methods ?? {}),
        },
        freeShippingThreshold: Number(parsed.freeShippingThreshold ?? DEFAULT_CONFIG.freeShippingThreshold),
        defaultCapacityPerWindow: Number(parsed.defaultCapacityPerWindow ?? DEFAULT_CONFIG.defaultCapacityPerWindow),
      };
    } catch {
      throw new BadRequestException('Shipping configuration is invalid');
    }
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
