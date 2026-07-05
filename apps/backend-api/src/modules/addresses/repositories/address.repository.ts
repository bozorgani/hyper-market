import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Address, AddressDocument } from '../schemas/address.schema';

@Injectable()
export class AddressRepository {
  constructor(@InjectModel(Address.name) private readonly model: Model<AddressDocument>) {}

  async create(data: Partial<Address>): Promise<Address> {
    return new this.model(data).save();
  }

  async findByUserId(userId: string): Promise<Address[]> {
    return this.model.find({ userId: new Types.ObjectId(userId), deletedAt: null }).sort({ isDefault: -1, createdAt: -1 }).lean().exec();
  }

  async findByIdForUser(id: string, userId: string): Promise<Address | null> {
    if (!isValidObjectId(id)) return null;
    return this.model.findOne({ _id: id, userId: new Types.ObjectId(userId), deletedAt: null }).lean().exec();
  }

  async updateByIdForUser(id: string, userId: string, data: Partial<Address>): Promise<Address | null> {
    if (!isValidObjectId(id)) return null;
    return this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId), deletedAt: null },
      data,
      { returnDocument: 'after' },
    ).exec();
  }

  async softDelete(id: string, userId: string): Promise<Address | null> {
    if (!isValidObjectId(id)) return null;
    return this.model.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId), deletedAt: null },
      { deletedAt: new Date(), isDefault: false },
      { returnDocument: 'after' },
    ).exec();
  }

  async unsetDefault(userId: string): Promise<void> {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), deletedAt: null }, { $set: { isDefault: false } }).exec();
  }

  async countByUser(userId: string): Promise<number> {
    return this.model.countDocuments({ userId: new Types.ObjectId(userId), deletedAt: null }).exec();
  }
}
