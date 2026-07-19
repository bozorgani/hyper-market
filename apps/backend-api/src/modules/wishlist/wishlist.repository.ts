import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './wishlist.schema';

@Injectable()
export class WishlistRepository {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async getWishlist(userId: string, page = 1, limit = 20): Promise<{ products: any[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrevious: boolean } } | null> {
    const pipeline = [
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $facet: {
          data: [
            { $project: { products: 1, _id: 0 } },
            { $unwind: "$products" },
            {
              $lookup: {
                from: "products",
                localField: "products",
                foreignField: "_id",
                as: "productDetails",
              },
            },
            { $unwind: "$productDetails" },
            {
              $replaceRoot: { newRoot: "$productDetails" },
            },
            {
              $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "categoryId",
              },
            },
            { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                "categoryId.name": 1,
                "categoryId._id": 1,
                name: 1,
                price: 1,
                discountPrice: 1,
                images: 1,
                stock: 1,
                isActive: 1,
                categoryId: {
                  $cond: {
                    if: "$categoryId",
                    then: { name: "$categoryId.name" },
                    else: null,
                  },
                },
              },
            },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.wishlistModel.aggregate(pipeline).exec();
    const data = result?.data || [];
    const totalCount = result?.total?.[0]?.count || 0;

    if (totalCount === 0) {
      return null;
    }

    return {
      products: data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrevious: page > 1,
      },
    };
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
