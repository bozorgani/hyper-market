import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type AnalyticsEventDocument = HydratedDocument<AnalyticsEvent>;

export enum AnalyticsEventType {
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  PRODUCT_CLICK = 'PRODUCT_CLICK',
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  CHECKOUT_START = 'CHECKOUT_START',
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  SEARCH_QUERY = 'SEARCH_QUERY',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
}

@Schema({
  collection: 'analytics_events',
  versionKey: false,
})
export class AnalyticsEvent {
  @Prop({ type: String, default: null, index: true })
  userId?: string | null;

  @Prop({ type: String, enum: AnalyticsEventType, required: true, index: true })
  type!: AnalyticsEventType;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp!: Date;

  @Prop({ type: String, default: null, index: true })
  sessionId?: string | null;

  @Prop({ type: String, default: null, index: true })
  deviceId?: string | null;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ type: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ 'metadata.productId': 1, type: 1 });
AnalyticsEventSchema.index({ 'metadata.query': 1, type: 1 });
