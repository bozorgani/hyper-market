import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class MailService {
  private readonly queueName = 'mail';

  constructor(private readonly queueService: QueueService) {}

  async sendOtpEmail(email: string, code: string): Promise<void> {
    await this.queueService.createJob(this.queueName, {
      type: 'otp_email',
      email,
      code,
    });
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    await this.queueService.createJob(this.queueName, {
      type: 'password_reset_email',
      email,
      code,
    });
  }
}
