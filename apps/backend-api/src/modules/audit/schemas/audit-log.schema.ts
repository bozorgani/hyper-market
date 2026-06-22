import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditAction } from '../enums/audit-action.enum';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  versionKey: false,
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ type: SchemaTypes.ObjectId, default: null, index: true })
  userId?: Types.ObjectId | null;

  @Prop({ type: String, enum: AuditAction, required: true, index: true })
  action!: AuditAction;

  @Prop({ type: String, default: null })
  ipAddress?: string | null;

  @Prop({ type: String, default: null })
  deviceId?: string | null;

  @Prop({ type: String, default: null })
  userAgent?: string | null;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
