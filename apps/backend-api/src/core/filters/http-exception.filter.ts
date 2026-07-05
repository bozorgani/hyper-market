import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { ErrorTrackingService } from '../../infrastructure/observability/error-tracking.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { BaseException } from '../exceptions/base.exception';

interface ExceptionResponse {
  message?: string | string[];
  error?: string;
  errorCode?: string;
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional() private readonly loggerService?: LoggerService,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly errorTrackingService?: ErrorTrackingService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as ExceptionResponse;
      const responseMessage = res.message ?? 'Something went wrong';

      if (Array.isArray(responseMessage)) {
        message = 'Validation failed';
        errors = responseMessage;
      } else {
        message = responseMessage;
      }
    } else if (exception instanceof BaseException) {
      status = exception.statusCode;
      message = exception.message;
    }

    const requestId = request.requestId ?? request.get('x-request-id');
    const traceId = request.traceId ?? request.get('x-trace-id') ?? requestId;
    if (requestId) {
      response.setHeader('x-request-id', requestId);
    }
    if (traceId) {
      response.setHeader('x-trace-id', traceId);
    }

    const exceptionName = exception instanceof Error ? exception.name : 'UnknownException';
    this.metricsService?.recordException(exceptionName, status);
    this.loggerService?.error('HTTP exception handled', {
      requestId,
      traceId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: status,
      exceptionName,
      message: exception instanceof Error ? exception.message : String(message),
    });

    if (status >= 500) {
      void this.errorTrackingService?.captureException(exception, {
        requestId,
        traceId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode: status,
      });
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
      ...(requestId && { requestId }),
      ...(traceId && { traceId }),
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
