import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { MailService } from './mail.service';

@Module({
  imports: [QueueModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
