import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../shared/interfaces/pagination.interface';
import { paginatedResult } from '../../../shared/utils/pagination.util';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../products/schemas/product.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';

export type CategoryListResult = PaginatedResult<Category>;

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

  async findPublicById(id: string): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;
    return this.categoryModel
      .findOne({ _id: id, deletedAt: null, isActive: true })
      .lean()
      .exec();
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

  async findAllPublic(): Promise<Category[]> {
    return this.categoryModel
      .find({ deletedAt: null, isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<CategoryListResult> {
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null, isActive: true };
    const [items, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async findAllPaginatedForAdmin(
    page: number,
    limit: number,
  ): Promise<CategoryListResult> {
    const skip = (page - 1) * limit;
    const filter = { deletedAt: null };
    const [items, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);
    return paginatedResult(items, total, page, limit);
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

  async hasChildCategories(categoryId: string): Promise<boolean> {
    if (!isValidObjectId(categoryId)) return false;
    const count = await this.categoryModel
      .countDocuments({
        parentId: new Types.ObjectId(categoryId),
        deletedAt: null,
      })
      .exec();

    return count > 0;
  }
}
