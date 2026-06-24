import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { BaseRepository } from '../../../shared/interfaces/base-repository.interface';
import { AccountStatus } from '../enums/account-status.enum';
import { User, UserDocument } from '../schemas/user.schema';

export type UserWithId = User & { _id: Types.ObjectId };

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

  async findAll(): Promise<User[]> {
    return this.userModel
      .find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .lean()
      .exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserWithId | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .select('+passwordHash')
      .lean<UserWithId>()
      .exec();
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel
      .findOne({ phoneNumber: phone, deletedAt: null })
      .lean()
      .exec();
  }

  async findByPhoneWithPassword(phone: string): Promise<UserWithId | null> {
    return this.userModel
      .findOne({ phoneNumber: phone, deletedAt: null })
      .select('+passwordHash')
      .lean<UserWithId>()
      .exec();
  }

  async updateById(id: string, data: Partial<User>): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, data, { new: true })
      .exec();
  }

  async verifyEmail(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { isEmailVerified: true, accountStatus: 'active' },
        { new: true },
      )
      .exec();
  }

  async verifyPhone(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { isPhoneVerified: true, accountStatus: 'active' },
        { new: true },
      )
      .exec();
  }

  async updatePasswordAndIncrementTokenVersion(
    id: string,
    passwordHash: string,
  ): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          passwordHash,
          passwordChangedAt: new Date(),
          $inc: { tokenVersion: 1 },
        },
        { new: true },
      )
      .exec();
  }

  async incrementTokenVersion(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $inc: { tokenVersion: 1 } },
        { new: true },
      )
      .exec();
  }

  async incrementFailedLoginAttempts(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { $inc: { failedLoginAttempts: 1 }, lastFailedLoginAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async lockAccount(id: string, lockedUntil: Date): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        { lockedUntil },
        { new: true },
      )
      .exec();
  }

  async resetLoginSecurity(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
        { new: true },
      )
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

  async blockUser(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          accountStatus: AccountStatus.SUSPENDED,
          lockedUntil: null,
          $inc: { tokenVersion: 1 },
        },
        { new: true },
      )
      .exec();
  }

  async unblockUser(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    return this.userModel
      .findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
          accountStatus: AccountStatus.ACTIVE,
          lockedUntil: null,
          failedLoginAttempts: 0,
          $inc: { tokenVersion: 1 },
        },
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
