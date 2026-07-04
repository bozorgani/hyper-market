import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { PermissionsService } from '../services/permissions.service';

class GrantPermissionDto {
  role!: string;
  permissionName!: string;
  resource!: string;
  action!: string;
}

class RevokePermissionDto {
  role!: string;
  permissionName!: string;
}

@Controller('permissions')
@Roles(UserRole.SUPER_ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

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
    const permissions = await this.permissionsService.getPermissionsForRole(role as UserRole);
    return { role, permissions };
  }

  /**
   * POST /permissions/grant — grant a permission to a role
   */
  @Post('grant')
  @Permissions('permissions.update')
  async grantPermission(@Body() dto: GrantPermissionDto) {
    await this.permissionsService.grantPermission(
      dto.role,
      dto.permissionName,
      dto.resource,
      dto.action,
    );
    return { success: true, message: `Permission "${dto.permissionName}" granted to role "${dto.role}"` };
  }

  /**
   * POST /permissions/revoke — revoke a permission from a role
   */
  @Post('revoke')
  @Permissions('permissions.update')
  async revokePermission(@Body() dto: RevokePermissionDto) {
    const revoked = await this.permissionsService.revokePermission(dto.role, dto.permissionName);
    if (!revoked) {
      return { success: false, message: `Permission "${dto.permissionName}" not found for role "${dto.role}"` };
    }
    return { success: true, message: `Permission "${dto.permissionName}" revoked from role "${dto.role}"` };
  }

  /**
   * POST /permissions/seed — re-seed from static constant
   */
  @Post('seed')
  @Permissions('permissions.update')
  async seedFromConstant() {
    await this.permissionsService.seedFromConstant();
    return { success: true, message: 'Permissions seeded from static constant' };
  }
}
