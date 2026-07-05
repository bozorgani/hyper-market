import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { Permissions } from '../decorators/permissions.decorator';
import { GrantPermissionDto, RevokePermissionDto } from '../dto/permission.dto';
import { PermissionsService } from '../services/permissions.service';

@Controller('permissions')
@Roles(UserRole.SUPER_ADMIN)
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * GET /permissions — full role→permissions map
   */
  @Get()
  @Permissions('permissions.read')
  async getFullPermissionMap() {
    return this.permissionsService.getFullPermissionMap();
  }

  /**
   * GET /permissions/:role — permissions for a specific role
   */
  @Get(':role')
  @Permissions('permissions.read')
  async getRolePermissions(@Param('role') role: string) {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException('Invalid role');
    }

    const permissions = await this.permissionsService.getPermissionsForRole(role as UserRole);
    return { role, permissions };
  }

  /**
   * POST /permissions/grant — grant a permission to a role
   */
  @Post('grant')
  @Permissions('permissions.update')
  async grantPermission(
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    await this.permissionsService.grantPermission(
      dto.role,
      dto.permissionName,
      dto.resource,
      dto.action,
    );
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PERMISSION_GRANTED,
      resource: 'permission',
      resourceId: `${dto.role}:${dto.permissionName}`,
      metadata: { ...dto },
      request,
    });
    return { success: true, message: `Permission "${dto.permissionName}" granted to role "${dto.role}"` };
  }

  /**
   * POST /permissions/revoke — revoke a permission to a role
   */
  @Post('revoke')
  @Permissions('permissions.update')
  async revokePermission(
    @Body() dto: RevokePermissionDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const revoked = await this.permissionsService.revokePermission(dto.role, dto.permissionName);
    if (!revoked) {
      return { success: false, message: `Permission "${dto.permissionName}" not found for role "${dto.role}"` };
    }
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PERMISSION_REVOKED,
      resource: 'permission',
      resourceId: `${dto.role}:${dto.permissionName}`,
      metadata: { ...dto },
      request,
    });
    return { success: true, message: `Permission "${dto.permissionName}" revoked from role "${dto.role}"` };
  }

  /**
   * POST /permissions/seed — re-seed from static constant
   */
  @Post('seed')
  @Permissions('permissions.update')
  async seedFromConstant(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    await this.permissionsService.seedFromConstant();
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PERMISSIONS_SEEDED,
      resource: 'permission',
      metadata: { source: 'ROLE_PERMISSIONS' },
      request,
    });
    return { success: true, message: 'Permissions seeded from static constant' };
  }
}
