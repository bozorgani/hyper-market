import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 }, { unique: true });
