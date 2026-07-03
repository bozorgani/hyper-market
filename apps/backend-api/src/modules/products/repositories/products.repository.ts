import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model, Types } from 'mongoose';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { Order, OrderDocument } from '../../orders/schemas/order.schema';
import { Product, ProductDocument } from '../schemas/product.schema';

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

// Escape regex metacharacters so user-supplied search text matches literally
// instead of being interpreted as a regex pattern (which can throw on input
// like "c++" or "(test").
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    const product = new this.productModel(data);
    return product.save();
  }

  async findById(id: string, session?: ClientSession): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel
      .findOne({ _id: id, deletedAt: null })
      .session(session ?? null)
      .lean()
      .exec();
  }


  async findByIds(ids: string[]): Promise<Product[]> {
    const objectIds = ids
      .filter((id) => isValidObjectId(id))
      .map((id) => new Types.ObjectId(id));

    if (objectIds.length === 0) {
      return [];
    }

    return this.productModel
      .find({ _id: { $in: objectIds }, deletedAt: null })
      .lean()
      .exec();
  }


  async getActiveOrderQuantityForProduct(productId: string): Promise<number> {
    if (!isValidObjectId(productId)) return 0;

    const [result] = await this.orderModel
      .aggregate<{ quantity: number }>([
        {
          $match: {
            status: {
              $in: [
                OrderStatus.PENDING,
                OrderStatus.PAID,
                OrderStatus.PROCESSING,
              ],
            },
            'items.productId': new Types.ObjectId(productId),
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': new Types.ObjectId(productId) } },
        { $group: { _id: null, quantity: { $sum: '$items.quantity' } } },
      ])
      .exec();

    return result?.quantity ?? 0;
  }

  async updateById(id: string, data: Partial<Product>): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        data,
        { returnDocument: 'after' },
      )
      .exec();
  }

  async softDelete(id: string): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date(), isActive: false },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async reduceStock(
    id: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel
      .findOneAndUpdate(
        {
          _id: id,
          deletedAt: null,
          isActive: true,
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async restoreStock(
    id: string,
    quantity: number,
    session?: ClientSession,
  ): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $inc: { stock: quantity } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async findActiveProducts(
    page: number,
    limit: number,
    search?: string,
  ): Promise<ProductListResult> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };
    if (search) {
      filter.name = { $regex: escapeRegExp(search), $options: "i" };
    }
    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findByCategory(
    categoryId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<ProductListResult> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
      deletedAt: null,
    };
    if (search) {
      filter.name = { $regex: escapeRegExp(search), $options: "i" };
    }
    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }
}
