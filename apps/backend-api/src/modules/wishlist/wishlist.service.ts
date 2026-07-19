import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WishlistRepository } from './wishlist.repository';
import { ProductsService } from '../products/services/products.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly productsService: ProductsService,
  ) {}

  async getWishlist(userId: string, page = 1, limit = 20) {
    const result = await this.wishlistRepository.getWishlist(userId, page, limit);

    if (!result || result.products.length === 0) {
      return {
        products: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }

    return {
      products: result.products,
      pagination: result.pagination,
    };
  }

  async addToWishlist(userId: string, productId: string) {
    // Verify product exists and is active
    const product = await this.productsService.getProductById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Check if already in wishlist
    const isInWishlist = await this.wishlistRepository.isInWishlist(
      userId,
      productId,
    );

    if (isInWishlist) {
      throw new BadRequestException('Product is already in your wishlist');
    }

    const wishlist = await this.wishlistRepository.addToWishlist(
      userId,
      productId,
    );

    return {
      message: 'Product added to wishlist',
      wishlist,
      productCount: wishlist.products.length,
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const isInWishlist = await this.wishlistRepository.isInWishlist(
      userId,
      productId,
    );

    if (!isInWishlist) {
      throw new NotFoundException('Product is not in your wishlist');
    }

    const wishlist = await this.wishlistRepository.removeFromWishlist(
      userId,
      productId,
    );

    return {
      message: 'Product removed from wishlist',
      wishlist,
      productCount: wishlist?.products.length || 0,
    };
  }

  async toggleWishlist(userId: string, productId: string) {
    const isInWishlist = await this.wishlistRepository.isInWishlist(
      userId,
      productId,
    );

    if (isInWishlist) {
      return this.removeFromWishlist(userId, productId);
    } else {
      return this.addToWishlist(userId, productId);
    }
  }

  async isInWishlist(userId: string, productId: string) {
    return this.wishlistRepository.isInWishlist(userId, productId);
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.wishlistRepository.clearWishlist(userId);

    return {
      message: 'Wishlist cleared',
      wishlist,
    };
  }

  async getWishlistCount(userId: string) {
    return this.wishlistRepository.getWishlistCount(userId);
  }

  async getWishlistProductIds(userId: string) {
    return this.wishlistRepository.getWishlistProductIds(userId);
  }
}
