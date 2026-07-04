import { Module } from '@nestjs/common';
import { SearchModule } from '../../modules/search/search.module';
import { MailModule } from '../../modules/mail/mail.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MeilisearchHealthIndicator } from './indicators/meilisearch.health';
import { SmtpHealthIndicator } from './indicators/smtp.health';

@Module({
  imports: [SearchModule, MailModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    MeilisearchHealthIndicator,
    SmtpHealthIndicator,
  ],
  exports: [HealthService],
})
export class HealthModule {}
