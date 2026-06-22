import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { BaseRepository } from '../../../shared/interfaces/base-repository.interface';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersRepository implements BaseRepository<User> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .lean()
      .exec();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel
      .findOne({ phoneNumber: phone, deletedAt: null })
      .lean()
      .exec();
  }

  async updateById(id: string, data: Partial<User>): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, data, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null }, { _id: 1 })
      .lean()
      .exec();
    return !!user;
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const user = await this.userModel
      .findOne({ phoneNumber: phone, deletedAt: null }, { _id: 1 })
      .lean()
      .exec();
    return !!user;
  }
}
