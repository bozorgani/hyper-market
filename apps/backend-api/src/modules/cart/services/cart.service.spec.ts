import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartRepository } from '../repositories/cart.repository';
import { ProductsService } from '../../products/services/products.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';

const PRODUCT_ID = '507f1f77bcf86cd799439011';

describe('CartService — stock check under lock (#5)', () => {
  let service: CartService;
  let cartRepository: {
    getCartByUserId: jest.Mock;
    incrementItem: jest.Mock;
    pushItem: jest.Mock;
    setItemQuantity: jest.Mock;
    removeItem: jest.Mock;
    clearCart: jest.Mock;
    createCart: jest.Mock;
  };
  let productsService: {
    getProductById: jest.Mock;
    getProductsByIds: jest.Mock;
  };
  let redisService: {
    setIfNotExists: jest.Mock;
    delete: jest.Mock;
  };

  const existingCart = {
    _id: 'cart-1',
    userId: 'user-1',
    items: [{ productId: PRODUCT_ID, quantity: 1 }],
  };

  const activeProduct = {
    _id: PRODUCT_ID,
    name: 'Widget',
    price: 10,
    discountPrice: null,
    images: [],
    stock: 5,
    isActive: true,
  };

  beforeEach(async () => {
    cartRepository = {
      getCartByUserId: jest.fn().mockResolvedValue(existingCart),
      incrementItem: jest.fn().mockResolvedValue(existingCart),
      pushItem: jest.fn().mockResolvedValue(existingCart),
      setItemQuantity: jest.fn().mockResolvedValue(existingCart),
      removeItem: jest.fn().mockResolvedValue(existingCart),
      clearCart: jest.fn().mockResolvedValue(existingCart),
      createCart: jest.fn().mockResolvedValue(existingCart),
    };
    productsService = {
      getProductById: jest.fn().mockResolvedValue(activeProduct),
      getProductsByIds: jest.fn().mockResolvedValue([activeProduct]),
    };
    redisService = {
      setIfNotExists: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: cartRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads the product AFTER acquiring the lock (no stale stock snapshot)', async () => {
    const order: string[] = [];
    redisService.setIfNotExists.mockImplementation(async () => {
      order.push('lock');
      return true;
    });
    productsService.getProductById.mockImplementation(async () => {
      order.push('product');
      return activeProduct;
    });

    await service.addProductToCart('user-1', PRODUCT_ID, 2);

    expect(redisService.setIfNotExists).toHaveBeenCalledWith(
      'cart:lock:user-1',
      '1',
      10,
    );
    // The lock must be acquired before the (now in-lock) product read.
    expect(order[0]).toBe('lock');
    expect(order).toContain('product');
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('product'));
    expect(redisService.delete).toHaveBeenCalledWith('cart:lock:user-1');
  });

  it('increments the existing cart line when stock is sufficient', async () => {
    await service.addProductToCart('user-1', PRODUCT_ID, 2);

    expect(productsService.getProductById).toHaveBeenCalledWith(PRODUCT_ID);
    expect(cartRepository.incrementItem).toHaveBeenCalledWith(
      'user-1',
      PRODUCT_ID,
      2,
    );
  });

  it('throws when requested quantity exceeds available stock', async () => {
    productsService.getProductById.mockResolvedValue({
      ...activeProduct,
      stock: 1,
    });

    await expect(
      service.addProductToCart('user-1', PRODUCT_ID, 2),
    ).rejects.toThrow(BadRequestException);
    expect(cartRepository.incrementItem).not.toHaveBeenCalled();
  });

  it('throws when the product is inactive', async () => {
    productsService.getProductById.mockResolvedValue({
      ...activeProduct,
      isActive: false,
    });

    await expect(
      service.addProductToCart('user-1', PRODUCT_ID, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates stock inside the lock on quantity update too', async () => {
    productsService.getProductById.mockResolvedValue({
      ...activeProduct,
      stock: 1,
    });

    await expect(
      service.updateQuantity('user-1', PRODUCT_ID, 5),
    ).rejects.toThrow(BadRequestException);
    expect(cartRepository.setItemQuantity).not.toHaveBeenCalled();
  });
});
