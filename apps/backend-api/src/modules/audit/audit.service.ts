import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { AuditAction } from './enums/audit-action.enum';
import { AuditLogRepository } from './repositories/audit-log.repository';

type AuditInput = {
  actorUserId?: string | null;
  action: AuditAction;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
  deviceId?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async log(input: AuditInput): Promise<void> {
    try {
      await this.auditLogRepository.create({
        userId: input.actorUserId && isValidObjectId(input.actorUserId)
          ? new Types.ObjectId(input.actorUserId)
          : null,
        action: input.action,
        resource: input.resource ?? null,
        resourceId: input.resourceId ?? null,
        metadata: this.sanitizeMetadata(input.metadata ?? {}),
        requestId: input.request?.requestId ?? input.request?.get('x-request-id') ?? null,
        traceId: input.request?.traceId ?? input.request?.get('x-trace-id') ?? null,
        ipAddress: input.request?.ip ?? null,
        userAgent: input.request?.get('user-agent') ?? null,
        deviceId: input.deviceId ?? null,
      });
    } catch {
      // Audit logging must never break the business flow.
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const normalized = key.toLowerCase();
      if (normalized.includes('password') || normalized.includes('token') || normalized.includes('secret')) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = value;
      }
    }
    return output;
  }
}
