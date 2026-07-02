import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox.schema';
import { OutboxRepository } from './repositories/outbox.repository';
import { OutboxService } from './outbox.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OutboxEvent.name, schema: OutboxEventSchema },
    ]),
  ],
  providers: [OutboxRepository, OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
