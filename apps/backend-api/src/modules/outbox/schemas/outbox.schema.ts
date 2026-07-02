import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export enum OutboxStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  FAILED = 'FAILED',
}

/**
 * Durable store for domain events.
 *
 * Events are written here (PENDING) *before* they are delivered to in-process
 * subscribers. Once delivery is confirmed they are flipped to DISPATCHED.
 * A relay worker replays any PENDING row that was never confirmed (e.g. because
 * the process crashed mid-dispatch) so analytics/search stay consistent.
 */
@Schema({
  collection: 'outbox_events',
  versionKey: false,
  timestamps: true,
})
export class OutboxEvent {
  @Prop({ type: String, required: true, index: true })
  eventType!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  timestamp!: number;

  // Content hash of (type + payload). Enforces idempotent emit + replay.
  @Prop({ type: String, required: true, unique: true, index: true })
  dedupeKey!: string;

  @Prop({
    type: String,
    enum: OutboxStatus,
    default: OutboxStatus.PENDING,
    index: true,
  })
  status!: OutboxStatus;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: String, default: null })
  lastError?: string | null;

  @Prop({ type: Date, default: null })
  dispatchedAt?: Date | null;
}

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// Covers the relay sweep query (status + age).
OutboxEventSchema.index({ status: 1, createdAt: 1 });
