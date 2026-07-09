import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { MetricsService } from './metrics.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ObservabilityController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
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
