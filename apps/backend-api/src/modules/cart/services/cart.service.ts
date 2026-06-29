import { BadRequestException, Injectable } from '@nestjs/common';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { Product } from '../../products/schemas/product.schema';
import { ProductsService } from '../../products/services/products.service';
import { CartRepository } from '../repositories/cart.repository';
import { Cart, CartItem } from '../schemas/cart.schema';

export type CartDetailedItem = {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  stock: number;
  lineTotal: number;
};

export type CartSummary = {
  cart: Cart;
  totalPrice: number;
  items: CartDetailedItem[];
};

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getCartByUserId(userId: string): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }

  async getCartSummary(userId: string): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.getDetailedCartItems(cart);
    const totalPrice = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return { cart, totalPrice, items };
  }

  async addProductToCart(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartSummary> {
    this.ensureValidObjectId(productId, 'Invalid product id');
    const product = await this.productsService.getProductById(productId);

    if (!product.isActive) {
      throw new BadRequestException('Product is not active');
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient product stock');
    }

    await this.getOrCreateCart(userId);
    const updatedCart =
      (await this.cartRepository.addItem(userId, productId, quantity)) ??
      (await this.cartRepository.pushItem(userId, productId, quantity));

    if (!updatedCart) {
      throw new BadRequestException('Unable to update cart');
    }

    return this.getCartSummary(userId);
  }

  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartSummary> {
    return this.addProductToCart(userId, productId, quantity);
  }

  async removeProduct(userId: string, productId: string): Promise<CartSummary> {
    this.ensureValidObjectId(productId, 'Invalid product id');
    await this.getOrCreateCart(userId);
    await this.cartRepository.removeItem(userId, productId);

    return this.getCartSummary(userId);
  }

  async clearCart(userId: string, session?: ClientSession): Promise<Cart> {
    await this.getOrCreateCart(userId);
    const cart = await this.cartRepository.clearCart(userId, session);

    if (!cart) {
      throw new BadRequestException('Unable to clear cart');
    }

    return cart;
  }

  async calculateCartTotal(cart: Cart): Promise<number> {
    const items = await this.getDetailedCartItems(cart);
    return items.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  // NOTE: This method is deprecated for order creation.
  // All validation and price snapshot now happens inside OrdersService transaction.
  async validateCartStock(cart: Cart): Promise<void> {
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await this.productsService.getProductById(
        getEntityId(item.productId),
      );

      if (!product.isActive) {
        throw new BadRequestException(`Product ${getEntityId(item.productId)} is not active`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${getEntityId(item.productId)}`,
        );
      }
    }
  }

  // NOTE: Deprecated - price snapshot logic moved to OrdersService
  async getOrderItemsFromCart(cart: Cart): Promise<Array<CartItem & { priceAtPurchase: number }>> {
    const orderItems: Array<CartItem & { priceAtPurchase: number }> = [];

    for (const item of cart.items) {
      const product = await this.productsService.getProductById(
        getEntityId(item.productId),
      );
      orderItems.push({
        productId: new Types.ObjectId(getEntityId(item.productId)),
        quantity: item.quantity,
        priceAtPurchase: this.getProductPrice(product),
      });
    }

    return orderItems;
  }

  private async getDetailedCartItems(cart: Cart): Promise<CartDetailedItem[]> {
    const items: CartDetailedItem[] = [];

    for (const item of cart.items) {
      const product = await this.productsService.getProductById(
        getEntityId(item.productId),
      );
      const price = this.getProductPrice(product);

      items.push({
        productId: getEntityId(product),
        quantity: item.quantity,
        name: product.name,
        price,
        discountPrice: product.discountPrice ?? null,
        image: product.images?.[0] ?? null,
        stock: product.stock,
        lineTotal: price * item.quantity,
      });
    }

    return items;
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    const existingCart = await this.cartRepository.getCartByUserId(userId);
    if (existingCart) {
      return existingCart;
    }

    return this.cartRepository.createCart(userId);
  }

  private getProductPrice(product: Product): number {
    return product.discountPrice ?? product.price;
  }

  private ensureValidObjectId(id: string, message: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }

}
