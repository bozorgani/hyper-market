import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
  collection: 'categories',
  timestamps: true,
  versionKey: false,
})
export class Category {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  slug!: string;

  /** Optional short description of the category */
  @Prop({ type: String, trim: true, default: null })
  description?: string | null;

  /** Emoji or icon identifier for UI rendering (e.g. "📱", "laptop") */
  @Prop({ type: String, trim: true, default: null })
  icon?: string | null;

  /** Cover / representative image URL for the category */
  @Prop({ type: String, trim: true, default: null })
  image?: string | null;

  /** Parent category for hierarchical structure (null = root category) */
  @Prop({ type: SchemaTypes.ObjectId, ref: Category.name, default: null, index: true })
  parentId?: Types.ObjectId | null;

  /** Display sort order (lower = shown first) */
  @Prop({ type: Number, default: 0, min: 0 })
  sortOrder!: number;

  /** Whether the category is visible to customers */
  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ deletedAt: 1 });
CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ isActive: 1, deletedAt: 1 });
