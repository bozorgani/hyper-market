import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { LoggerService } from './logger.service';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    traceId?: string;
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = this.getOrCreateRequestId(request);
    const traceId = this.getOrCreateTraceId(request, requestId);
    request.requestId = requestId;
    request.traceId = traceId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.setHeader('x-trace-id', traceId);

    const startedAt = Date.now();
    response.on('finish', () => {
      this.loggerService.info('HTTP request completed', {
        requestId,
        traceId,
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
    const incomingTraceId = request.get('x-trace-id');
    if (incomingTraceId && this.isSafeRequestId(incomingTraceId)) {
      return incomingTraceId;
    }

    return requestId;
  }

  private isSafeRequestId(value: string): boolean {
    return /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
  }
}
