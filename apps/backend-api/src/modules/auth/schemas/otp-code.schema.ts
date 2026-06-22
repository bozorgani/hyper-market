import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { OtpType } from '../enums/otp-type.enum';

export type OtpCodeDocument = HydratedDocument<OtpCode>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'otp_codes',
})
export class OtpCode {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  target!: string;

  @Prop({ type: String, required: true })
  codeHash!: string;

  @Prop({ type: String, enum: OtpType, required: true })
  type!: OtpType;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Number, default: 0, max: 5 })
  attempts!: number;

  @Prop({ type: Date, default: null, index: true })
  blockedUntil?: Date | null;

  @Prop({ type: Date, default: null })
  verifiedAt?: Date | null;
}

export const OtpCodeSchema = SchemaFactory.createForClass(OtpCode);
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
