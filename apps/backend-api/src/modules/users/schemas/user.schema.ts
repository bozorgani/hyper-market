import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AccountStatus } from '../enums/account-status.enum';
import { TwoFactorMethod } from '../enums/two-factor-method.enum';
import { UserRole } from '../enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
  })
  email?: string;

  @Prop({
    type: String,
    unique: true,
    trim: true,
    match: [/^09\d{9}$/, 'Invalid phone number format'],
  })
  phoneNumber?: string;

  @Prop({ type: String, default: null, select: false })
  passwordHash?: string | null;

  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER, index: true })
  role!: UserRole;

  @Prop({ type: String, enum: AccountStatus, default: AccountStatus.PENDING, index: true })
  accountStatus!: AccountStatus;

  @Prop({ type: Boolean, default: false })
  isEmailVerified!: boolean;

  @Prop({ type: Boolean, default: false })
  isPhoneVerified!: boolean;

  @Prop({ type: Boolean, default: false })
  twoFactorEnabled!: boolean;

  @Prop({ type: String, enum: TwoFactorMethod, default: TwoFactorMethod.NONE })
  twoFactorMethod!: TwoFactorMethod;

  @Prop({ type: Number, default: 0 })
  failedLoginAttempts!: number;

  @Prop({ type: Date, default: null })
  lockedUntil?: Date | null;

  @Prop({ type: Date, default: null })
  lastFailedLoginAt?: Date | null;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;

  @Prop({ type: Date, default: null })
  passwordChangedAt?: Date | null;

  @Prop({ type: Number, default: 1 })
  tokenVersion!: number;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
