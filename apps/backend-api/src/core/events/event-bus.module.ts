import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { OutboxRelayWorker } from './outbox-relay.worker';
import { OutboxModule } from '../../modules/outbox/outbox.module';

@Global()
@Module({
  imports: [OutboxModule],
  providers: [EventBusService, OutboxRelayWorker],
  exports: [EventBusService],
})
export class EventBusModule {}
