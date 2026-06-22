import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const token = new this.refreshTokenModel(data);
    return token.save();
  }

  async findById(id: string): Promise<RefreshToken | null> {
    if (!isValidObjectId(id)) return null;
    return this.refreshTokenModel.findById(id).lean().exec();
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.refreshTokenModel
      .findOne({ tokenHash, revokedAt: null })
      .lean()
      .exec();
  }

  async findActiveToken(
    userId: string,
    deviceId: string,
  ): Promise<RefreshToken | null> {
    return this.refreshTokenModel
      .findOne({ userId, deviceId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .lean()
      .exec();
  }

  async revokeToken(id: string): Promise<RefreshToken | null> {
    if (!isValidObjectId(id)) return null;
    return this.refreshTokenModel
      .findByIdAndUpdate(id, { revokedAt: new Date() }, { new: true })
      .exec();
  }
}
