import { Injectable } from '@nestjs/common';
import { winstonLogger } from './logger.config';

@Injectable()
export class LoggerService {
  info(message: string, meta?: unknown): void {
    winstonLogger.info(message, meta);
  }

  warn(message: string, meta?: unknown): void {
    winstonLogger.warn(message, meta);
  }

  error(message: string, meta?: unknown): void {
    winstonLogger.error(message, meta);
  }

  debug(message: string, meta?: unknown): void {
    winstonLogger.debug(message, meta);
  }
}
