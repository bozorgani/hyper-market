import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../services/permissions.service';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

/**
 * RBAC guard that checks if the authenticated user's role has the
 * required permissions.
 *
 * Permission resolution is dynamic (DB + Redis cache) with static
 * constant fallback — see PermissionsService for details.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role as UserRole | undefined;

    if (!role) {
      throw new ForbiddenException('Missing user permissions');
    }

    const rolePermissions = await this.permissionsService.getPermissionsForRole(role);
    const hasWildcard = rolePermissions.includes('*');
    const hasAllPermissions = requiredPermissions.every((permission) =>
      rolePermissions.includes(permission),
    );

    if (!hasWildcard && !hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
