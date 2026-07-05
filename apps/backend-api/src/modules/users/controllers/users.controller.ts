import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';

@Controller('users')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Permissions('users.read')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('accountStatus') accountStatus?: string,
  ) {
    if (page || limit) {
      return this.usersService.listUsersPaginated(
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
        role,
        accountStatus,
      );
    }
    return this.usersService.listUsers();
  }

  @Get(':id')
  @Permissions('users.read')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserByIdOrFail(id);
  }

  @Patch(':id/block')
  @Permissions('users.ban')
  async blockUser(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const blocked = await this.usersService.blockUser(id, user.sub);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.USER_BLOCKED,
      resource: 'user',
      resourceId: id,
      metadata: { targetRole: blocked.role },
      request,
    });
    return blocked;
  }

  @Patch(':id/unblock')
  @Permissions('users.ban')
  async unblockUser(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const unblocked = await this.usersService.unblockUser(id);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.USER_UNBLOCKED,
      resource: 'user',
      resourceId: id,
      metadata: { targetRole: unblocked.role },
      request,
    });
    return unblocked;
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }
}
