import { Injectable } from '@nestjs/common';
import { SmtpTransportService } from '../../../modules/mail/smtp-transport.service';
import { HealthIndicator, HealthIndicatorResult } from '../health-indicators.interface';

@Injectable()
export class SmtpHealthIndicator implements HealthIndicator {
  readonly name = 'smtp';

  constructor(private readonly smtpTransportService: SmtpTransportService) {}

  async check(): Promise<HealthIndicatorResult> {
    // SMTP check is synchronous — no network call (we already verified on startup)
    if (this.smtpTransportService.ready) {
      return { status: 'ok' };
    }
    // SMTP not configured is "degraded" (not "down") — the app works without email
    return {
      status: 'degraded',
      error: 'SMTP not configured or connection failed — email delivery is disabled',
    };
  }
}
