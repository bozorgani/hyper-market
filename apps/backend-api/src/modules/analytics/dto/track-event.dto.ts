import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnalyticsEventType } from '../schemas/event.schema';

export class TrackEventDto {
  // Kept for backward compatibility with older clients, but ignored by controller.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string | null;

  @IsEnum(AnalyticsEventType)
  type!: AnalyticsEventType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string | null;
}
