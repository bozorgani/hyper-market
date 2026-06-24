import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { MailService } from './mail.service';
import { MailWorker } from './mail.worker';
import { SmsIrService } from './sms-ir.service';

@Module({
  imports: [QueueModule],
  providers: [MailService, MailWorker, SmsIrService],
  exports: [MailService, SmsIrService],
})
export class MailModule {}
