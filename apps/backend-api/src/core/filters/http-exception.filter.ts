import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';

interface ExceptionResponse {
  message?: string | string[];
  error?: string;
  errorCode?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
