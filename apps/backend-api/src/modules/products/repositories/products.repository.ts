import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';

export type ProductListResult = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    const product = new this.productModel(data);
    return product.save();
  }

  async findById(id: string): Promise<Product | null> {
    if (!isValidObjectId(id)) return null;
    return this.productModel.findOne({ _id: id, deletedAt: null }).lean().exec();
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

  async findActiveProducts(page: number, limit: number): Promise<ProductListResult> {
    const skip = (page - 1) * limit;
    const filter = { isActive: true, deletedAt: null };
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
  ): Promise<ProductListResult> {
    const skip = (page - 1) * limit;
    const filter = {
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
      deletedAt: null,
    };
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
