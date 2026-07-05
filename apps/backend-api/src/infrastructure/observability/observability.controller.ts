import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { MetricsService } from './metrics.service';

@Controller()
export class ObservabilityController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Public()
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    return this.metricsService.toPrometheus();
  }

  @Get('observability/dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  dashboard() {
    return this.metricsService.getSnapshot();
  }
}
