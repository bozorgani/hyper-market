import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './wishlist.schema';

@Injectable()
export class WishlistRepository {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async getWishlist(userId: string): Promise<Wishlist | null> {
    return this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'products',
        select: 'name price discountPrice images stock isActive categoryId',
        populate: {
          path: 'categoryId',
          select: 'name',
        },
      })
      .exec();
  }

  async addToWishlist(userId: string, productId: string): Promise<Wishlist> {
    return this.wishlistModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $addToSet: { products: new Types.ObjectId(productId) },
          $setOnInsert: { userId: new Types.ObjectId(userId) },
        },
        { upsert: true, new: true },
      )
      .populate({
        path: 'products',
        select: 'name price discountPrice images stock isActive categoryId',
        populate: {
          path: 'categoryId',
          select: 'name',
        },
      })
      .exec();
  }

  async removeFromWishlist(userId: string, productId: string): Promise<Wishlist | null> {
    return this.wishlistModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $pull: { products: new Types.ObjectId(productId) } },
        { new: true },
      )
      .populate({
        path: 'products',
        select: 'name price discountPrice images stock isActive categoryId',
        populate: {
          path: 'categoryId',
          select: 'name',
        },
      })
      .exec();
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const wishlist = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
      products: new Types.ObjectId(productId),
    });
    return !!wishlist;
  }

  async clearWishlist(userId: string): Promise<Wishlist | null> {
    return this.wishlistModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { products: [] } },
        { new: true },
      )
      .exec();
  }

  async getWishlistProductIds(userId: string): Promise<string[]> {
    const wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('products')
      .exec();

    return wishlist?.products?.map((id) => id.toString()) || [];
  }

  async getWishlistCount(userId: string): Promise<number> {
    const wishlist = await this.wishlistModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('products')
      .exec();

    return wishlist?.products?.length || 0;
  }
}
