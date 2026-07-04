import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, RedisOptions, Worker } from 'bullmq';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { SmtpTransportService } from './smtp-transport.service';
import { otpEmailHtml, passwordResetEmailHtml } from './email-templates';

type MailJobData = {
  type: 'otp_email' | 'password_reset_email';
  email: string;
  code: string;
};

@Injectable()
export class MailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly queueName = 'mail';
  private worker?: Worker<MailJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly smtpTransportService: SmtpTransportService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<MailJobData>(
      this.queueName,
      async (job) => this.processJob(job),
      {
        connection: this.createRedisConnectionOptions(),
      },
    );

    this.worker.on('failed', (job, error) => {
      this.loggerService.error('Mail queue job failed', {
        jobId: job?.id,
        type: job?.data.type,
        error: error.message,
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(job: Job<MailJobData>): Promise<void> {
    switch (job.data.type) {
      case 'otp_email':
        await this.handleOtpEmail(job.data);
        return;
      case 'password_reset_email':
        await this.handlePasswordResetEmail(job.data);
        return;
      default:
        throw new Error('Unsupported mail job type');
    }
  }

  private async handleOtpEmail(data: MailJobData): Promise<void> {
    const expiresMinutes = 10;

    if (this.smtpTransportService.ready) {
      await this.smtpTransportService.sendMail(
        data.email,
        'کد تأیید هایپرمارکت',
        otpEmailHtml(data.code, expiresMinutes),
      );
    } else {
      // Fallback: log to console when SMTP is not configured
      this.loggerService.info('[MAIL] OTP email (SMTP not configured — logged to console)', {
        email: data.email,
        code: data.code,
      });
    }
  }

  private async handlePasswordResetEmail(data: MailJobData): Promise<void> {
    const expiresMinutes = 10;

    if (this.smtpTransportService.ready) {
      await this.smtpTransportService.sendMail(
        data.email,
        'بازنشانی رمز عبور هایپرمارکت',
        passwordResetEmailHtml(data.code, expiresMinutes),
      );
    } else {
      this.loggerService.info('[MAIL] Password reset email (SMTP not configured — logged to console)', {
        email: data.email,
        code: data.code,
      });
    }
  }

  private createRedisConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      return {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
        username: parsedUrl.username || undefined,
        password: parsedUrl.password || undefined,
        db: parsedUrl.pathname ? parseInt(parsedUrl.pathname.replace('/', ''), 10) || 0 : 0,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
  }
}
