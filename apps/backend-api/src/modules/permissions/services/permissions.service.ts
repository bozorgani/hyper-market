import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { LoggerService } from '../../../infrastructure/logger/logger.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { PermissionRepository } from '../repositories/permission.repository';
import { ROLE_PERMISSIONS } from '../role-permissions.constant';

/**
 * Cache key for storing the entire role→permissions map in Redis.
 * Structure: { role: string → string[] }
 */
const PERMISSIONS_CACHE_KEY = 'permissions:role-map';
const PERMISSIONS_CACHE_TTL = 300; // 5 minutes

/**
 * Dynamic RBAC service.
 *
 * Resolution order for a role's permissions:
 *   1. Redis cache (if available)
 *   2. MongoDB `permissions` collection (if documents exist for the role)
 *   3. Static fallback from ROLE_PERMISSIONS constant
 *
 * This ensures:
 *   - Zero downtime when switching from static → dynamic permissions
 *   - Super-fast lookups via Redis cache
 *   - Automatic fallback when DB/Redis is empty or unavailable
 *   - Admin UI can manage permissions via DB without code changes
 */
@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly redisService: RedisService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * On startup, seed the DB from the static constant if the permissions
   * collection is empty (first run / fresh DB).
   */
  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.permissionRepository.findDistinctRoles();
      if (existing.length === 0) {
        await this.seedFromConstant();
        this.loggerService.info(
          '[Permissions] Seeded role-permissions from static constant into DB (first run).',
        );
      } else {
        this.loggerService.info('[Permissions] Dynamic permissions loaded from DB.', {
          roles: existing,
        });
      }
    } catch (error) {
      this.loggerService.warn(
        '[Permissions] Could not seed permissions on startup; static constant will be used as fallback.',
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Get all permissions for a given role.
   * Uses: cache → DB → static constant (in that order).
   */
  async getPermissionsForRole(role: UserRole): Promise<string[]> {
    // 1. Try Redis cache
    try {
      const cached = await this.redisService.get<Record<string, string[]>>(PERMISSIONS_CACHE_KEY);
      if (cached && cached[role]) {
        return cached[role];
      }
      if (cached) {
        // Cache exists but role not in it — check if the full map was loaded
        // (role might have no DB-managed permissions → should still check static)
      }
    } catch {
      // Redis unavailable — fall through
    }

    // 2. Try DB
    try {
      const dbPermissions = await this.permissionRepository.findByRole(role);
      if (dbPermissions.length > 0) {
        const permissionNames = dbPermissions.map((p) => p.name);
        // Update cache
        await this.updateRoleInCache(role, permissionNames);
        return permissionNames;
      }
    } catch {
      // DB unavailable — fall through to static
    }

    // 3. Static fallback
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /**
   * Check if a role has a specific permission.
   */
  async hasPermission(role: UserRole, permission: string): Promise<boolean> {
    const permissions = await this.getPermissionsForRole(role);
    return permissions.includes('*') || permissions.includes(permission);
  }

  /**
   * Grant a permission to a role (DB + cache update).
   */
  async grantPermission(
    role: string,
    permissionName: string,
    resource: string,
    action: string,
  ): Promise<void> {
    await this.permissionRepository.upsert({
      role,
      name: permissionName,
      resource,
      action,
    });
    await this.invalidateCache();
    this.loggerService.info('[Permissions] Permission granted', { role, permissionName });
  }

  /**
   * Revoke a permission from a role (DB + cache update).
   */
  async revokePermission(role: string, permissionName: string): Promise<boolean> {
    const deleted = await this.permissionRepository.deleteByRoleAndName(role, permissionName);
    if (deleted) {
      await this.invalidateCache();
      this.loggerService.info('[Permissions] Permission revoked', { role, permissionName });
    }
    return deleted;
  }

  /**
   * Get the full role→permissions map (for admin UI).
   */
  async getFullPermissionMap(): Promise<Record<string, string[]>> {
    // Try cache first
    try {
      const cached = await this.redisService.get<Record<string, string[]>>(PERMISSIONS_CACHE_KEY);
      if (cached && Object.keys(cached).length > 0) {
        return this.mergeWithStatic(cached);
      }
    } catch {
      // Fall through
    }

    // Load from DB
    try {
      const allPermissions = await this.permissionRepository.findAll();
      const roleMap = this.buildRoleMap(allPermissions);

      // Store in cache
      try {
        await this.redisService.set(PERMISSIONS_CACHE_KEY, roleMap, PERMISSIONS_CACHE_TTL);
      } catch {
        // Cache write failure — non-critical
      }

      return this.mergeWithStatic(roleMap);
    } catch {
      // DB unavailable — return static
      return { ...ROLE_PERMISSIONS };
    }
  }

  /**
   * Seed the permissions collection from the static ROLE_PERMISSIONS constant.
   */
  async seedFromConstant(): Promise<void> {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const perm of permissions) {
        if (perm === '*') {
          await this.permissionRepository.upsert({
            role,
            name: perm,
            resource: '*',
            action: '*',
          });
        } else {
          const [resource, action] = perm.split('.');
          await this.permissionRepository.upsert({
            role,
            name: perm,
            resource: resource ?? perm,
            action: action ?? '*',
          });
        }
      }
    }
    await this.invalidateCache();
  }

  /**
   * Invalidate the permissions cache so next lookup hits DB.
   */
  async invalidateCache(): Promise<void> {
    try {
      await this.redisService.delete(PERMISSIONS_CACHE_KEY);
    } catch {
      // Best-effort
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private buildRoleMap(permissions: { role?: string; name: string }[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const perm of permissions) {
      if (!perm.role) continue;
      if (!map[perm.role]) {
        map[perm.role] = [];
      }
      map[perm.role].push(perm.name);
    }
    return map;
  }

  private async updateRoleInCache(role: string, permissions: string[]): Promise<void> {
    try {
      let cached = await this.redisService.get<Record<string, string[]>>(PERMISSIONS_CACHE_KEY);
      if (!cached) {
        cached = {};
      }
      cached[role] = permissions;
      await this.redisService.set(PERMISSIONS_CACHE_KEY, cached, PERMISSIONS_CACHE_TTL);
    } catch {
      // Cache write failure — non-critical
    }
  }

  /**
   * Merge DB-managed permissions with static constant permissions.
   * DB permissions take precedence. Static constant acts as fallback
   * for roles that have no DB-managed entries.
   */
  private mergeWithStatic(dbMap: Record<string, string[]>): Record<string, string[]> {
    const result: Record<string, string[]> = { ...ROLE_PERMISSIONS };
    for (const [role, permissions] of Object.entries(dbMap)) {
      if (permissions.length > 0) {
        result[role] = permissions;
      }
    }
    return result;
  }
}
