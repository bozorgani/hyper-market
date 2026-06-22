import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
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

    response.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }
}
