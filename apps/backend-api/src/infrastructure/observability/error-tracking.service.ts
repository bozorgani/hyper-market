import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ErrorTrackingService {
  constructor(private readonly loggerService: LoggerService) {}

  async captureException(error: unknown, context: Record<string, unknown>): Promise<void> {
    const payload = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
    };

    const webhookUrl = process.env.ERROR_TRACKING_WEBHOOK_URL;
    if (!webhookUrl) {
      this.loggerService.error('Exception captured', payload);
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (trackingError) {
      this.loggerService.error('Failed to send exception to error tracking webhook', {
        error: trackingError instanceof Error ? trackingError.message : String(trackingError),
        originalError: payload.message,
      });
    }
  }
}
