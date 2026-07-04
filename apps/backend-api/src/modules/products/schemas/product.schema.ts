import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  collection: 'products',
  timestamps: true,
  versionKey: false,
  /** Include the computed discountPercentage in JSON output */
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Product {
  @Prop({ type: String, required: true, trim: true, index: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  price!: number;

  @Prop({ type: Number, default: null, min: 0 })
  discountPrice?: number | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: SchemaTypes.ObjectId, ref: Category.name, required: true, index: true })
  categoryId!: Types.ObjectId;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  /** Brand name (e.g. Samsung, LG) */
  @Prop({ type: String, trim: true, default: null })
  brand?: string | null;

  /** Stock-Keeping Unit — unique warehouse code */
  @Prop({ type: String, trim: true, default: null, sparse: true, unique: true })
  sku?: string | null;

  /** Measurement unit (e.g. عدد, کیلوگرم, لیتر, متر) */
  @Prop({ type: String, trim: true, default: null })
  unit?: string | null;

  /** Weight in grams */
  @Prop({ type: Number, default: null, min: 0 })
  weight?: number | null;

  /** Searchable tags */
  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;

  /** Computed: discount percentage (0–100), derived from price & discountPrice */
  discountPercentage?: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

/** Virtual: compute discountPercentage from price and discountPrice */
ProductSchema.virtual('discountPercentage').get(function (this: Product) {
  if (!this.discountPrice || !this.price || this.price <= 0) return 0;
  return Math.max(0, Math.round(((this.price - this.discountPrice) / this.price) * 100));
});

ProductSchema.index({ isActive: 1, deletedAt: 1 });
ProductSchema.index({ categoryId: 1, isActive: 1, deletedAt: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ tags: 1 });
