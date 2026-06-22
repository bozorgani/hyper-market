import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { OtpCode, OtpCodeDocument } from '../schemas/otp-code.schema';
import { OtpType } from '../enums/otp-type.enum';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectModel(OtpCode.name) private readonly otpModel: Model<OtpCodeDocument>,
  ) {}

  async create(data: Partial<OtpCode>): Promise<OtpCode> {
    const otp = new this.otpModel(data);
    return otp.save();
  }

  async findValidOtp(target: string, type: OtpType): Promise<OtpCode | null> {
    return this.otpModel
      .findOne({ target, type, verifiedAt: null, expiresAt: { $gt: new Date() } })
      .lean()
      .exec();
  }

  async isBlocked(target: string, type: OtpType): Promise<boolean> {
    const otp = await this.otpModel
      .findOne({ target, type, blockedUntil: { $gt: new Date() } })
      .lean()
      .exec();
    return !!otp;
  }

  async incrementAttempts(id: string): Promise<OtpCode | null> {
    if (!isValidObjectId(id)) return null;
    return this.otpModel
      .findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true })
      .exec();
  }

  async markVerified(id: string): Promise<OtpCode | null> {
    if (!isValidObjectId(id)) return null;
    return this.otpModel
      .findByIdAndUpdate(id, { verifiedAt: new Date() }, { new: true })
      .exec();
  }
}
