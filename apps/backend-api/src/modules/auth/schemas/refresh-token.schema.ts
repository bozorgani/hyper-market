import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'refresh_tokens',
})
export class RefreshToken {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  tokenHash!: string;

  @Prop({ type: String, required: true })
  deviceId!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  sessionId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  jti!: string;

  @Prop({ type: String, required: true, index: true })
  tokenFamilyId!: string;

  @Prop({ type: String, default: null })
  replacedByTokenId?: string | null;

  @Prop({ type: Boolean, default: false })
  reuseDetected!: boolean;

  @Prop({ type: Number, required: true })
  tokenVersion!: number;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ userId: 1, deviceId: 1, revokedAt: 1 });
RefreshTokenSchema.index({ tokenFamilyId: 1, revokedAt: 1 });
RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
