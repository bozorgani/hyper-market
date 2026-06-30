import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../products/schemas/product.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: Partial<Category>): Promise<Category> {
    const category = new this.categoryModel(data);
    return category.save();
  }

  async findById(id: string): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;
    return this.categoryModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel.findOne({ slug, deletedAt: null }).lean().exec();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel
      .find({ deletedAt: null })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async updateById(id: string, data: Partial<Category>): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;
    return this.categoryModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, data, { returnDocument: 'after' })
      .exec();
  }

  async softDelete(id: string): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;
    return this.categoryModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async hasActiveProducts(categoryId: string): Promise<boolean> {
    if (!isValidObjectId(categoryId)) return false;
    const count = await this.productModel
      .countDocuments({
        categoryId: new Types.ObjectId(categoryId),
        deletedAt: null,
      })
      .exec();

    return count > 0;
  }
}
