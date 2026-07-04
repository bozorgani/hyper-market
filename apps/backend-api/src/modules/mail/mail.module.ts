import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { MailService } from './mail.service';
import { MailWorker } from './mail.worker';
import { SmsIrService } from './sms-ir.service';
import { SmtpTransportService } from './smtp-transport.service';

@Module({
  imports: [QueueModule],
  providers: [MailService, MailWorker, SmsIrService, SmtpTransportService, LoggerService],
  exports: [MailService, SmsIrService],
})
export class MailModule {}
