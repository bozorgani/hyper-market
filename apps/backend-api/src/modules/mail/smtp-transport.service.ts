import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { LoggerService } from '../../infrastructure/logger/logger.service';

export type SmtpOptions = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
};

@Injectable()
export class SmtpTransportService implements OnModuleInit {
  private transporter: Transporter | null = null;
  private readonly options: SmtpOptions;
  private _ready = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.options = this.readConfig();
  }

  async onModuleInit(): Promise<void> {
    if (!this.options.host || !this.options.user || !this.options.pass) {
      this.loggerService.warn(
        '[SMTP] SMTP_HOST / SMTP_USER / SMTP_PASS are not configured — email delivery is disabled. OTP emails will be logged to console only.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.options.host,
        port: this.options.port,
        secure: this.options.secure,
        auth: {
          user: this.options.user,
          pass: this.options.pass,
        },
      });

      await this.transporter.verify();
      this._ready = true;
      this.loggerService.info('[SMTP] Connection verified — email delivery is active.', {
        host: this.options.host,
        port: this.options.port,
        from: this.options.fromAddress,
      });
    } catch (error) {
      this.loggerService.error('[SMTP] Connection verification failed — email delivery is disabled.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  get ready(): boolean {
    return this._ready;
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter || !this._ready) {
      this.loggerService.warn('[SMTP] Attempted to send email but transport is not ready.', { to, subject });
      return;
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.options.fromName}" <${this.options.fromAddress}>`,
        to,
        subject,
        html,
      });

      this.loggerService.info('[SMTP] Email sent successfully.', {
        to,
        subject,
        messageId: result.messageId,
      });
    } catch (error) {
      this.loggerService.error('[SMTP] Failed to send email.', {
        to,
        subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private readConfig(): SmtpOptions {
    return {
      host: this.configService.get<string>('SMTP_HOST', ''),
      port: Number(this.configService.get<string>('SMTP_PORT', '587')),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      user: this.configService.get<string>('SMTP_USER', ''),
      pass: this.configService.get<string>('SMTP_PASS', ''),
      fromName: this.configService.get<string>('SMTP_FROM_NAME', 'هایپرمارکت'),
      fromAddress: this.configService.get<string>('SMTP_FROM_ADDRESS', 'noreply@hypermarket.ir'),
    };
  }
}
