import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ collection: 'addresses', timestamps: true, versionKey: false })
export class Address {
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  label?: string | null;

  @Prop({ type: String, required: true, trim: true })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true })
  phoneNumber!: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  province!: string;

  @Prop({ type: String, required: true, trim: true, index: true })
  city!: string;

  @Prop({ type: String, required: true, trim: true })
  addressLine!: string;

  @Prop({ type: String, default: null, trim: true })
  plate?: string | null;

  @Prop({ type: String, default: null, trim: true })
  unit?: string | null;

  @Prop({ type: String, default: null, trim: true })
  postalCode?: string | null;

  @Prop({ type: Boolean, default: false, index: true })
  isDefault!: boolean;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ userId: 1, isDefault: 1, deletedAt: 1 });
AddressSchema.index({ userId: 1, createdAt: -1 });
