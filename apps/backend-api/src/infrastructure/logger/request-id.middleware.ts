import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from '../observability/metrics.service';
import { LoggerService } from './logger.service';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    traceId?: string;
    spanId?: string;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    private readonly loggerService: LoggerService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.getOrCreateRequestId(request);
    const traceId = this.getOrCreateTraceId(request, requestId);
    request.requestId = requestId;
    const spanId = this.createSpanId();
    request.traceId = traceId;
    request.spanId = spanId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.setHeader('x-trace-id', traceId);
    response.setHeader('traceparent', this.toTraceparent(traceId, spanId));

    const startedAt = Date.now();
    response.on('finish', () => {
      this.metricsService?.recordHttpRequest(
        request.method,
        request.originalUrl ?? request.url,
        response.statusCode,
        Date.now() - startedAt,
      );
      this.loggerService.info('HTTP request completed', {
        requestId,
        traceId,
        spanId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  }

  private getOrCreateRequestId(request: Request): string {
    const incomingRequestId = request.get(REQUEST_ID_HEADER);
    if (incomingRequestId && this.isSafeRequestId(incomingRequestId)) {
      return incomingRequestId;
    }

    return randomUUID();
  }

  private getOrCreateTraceId(request: Request, requestId: string): string {
    const traceparent = request.get('traceparent');
    const traceparentTraceId = this.getTraceIdFromTraceparent(traceparent);
    if (traceparentTraceId) {
      return traceparentTraceId;
    }

    const incomingTraceId = request.get('x-trace-id');
    if (incomingTraceId && this.isSafeRequestId(incomingTraceId)) {
      return incomingTraceId;
    }

    return requestId;
  }

  private getTraceIdFromTraceparent(traceparent?: string): string | null {
    if (!traceparent) return null;
    const parts = traceparent.split('-');
    const traceId = parts[1];
    if (/^[a-f0-9]{32}$/i.test(traceId ?? '')) {
      return traceId;
    }
    return null;
  }

  private createSpanId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 16);
  }

  private toTraceparent(traceId: string, spanId: string): string {
    const normalizedTraceId = /^[a-f0-9]{32}$/i.test(traceId)
      ? traceId.toLowerCase()
      : randomUUID().replace(/-/g, '');
    return `00-${normalizedTraceId}-${spanId}-01`;
  }

  private isSafeRequestId(value: string): boolean {
    return /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
  }
}
