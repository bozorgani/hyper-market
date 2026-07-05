import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
import { ACTIVE_ROLES, UserRole } from '../../users/enums/user-role.enum';

const PERMISSION_NAME_PATTERN = /^(\*|[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)?)$/;
const PERMISSION_PART_PATTERN = /^(\*|[a-z][a-z0-9_-]*)$/;

export class GrantPermissionDto {
  @IsIn(ACTIVE_ROLES)
  role!: UserRole;

  @IsString()
  @MaxLength(100)
  @Matches(PERMISSION_NAME_PATTERN, {
    message: 'permissionName must be "*" or use resource.action format',
  })
  permissionName!: string;

  @IsString()
  @MaxLength(50)
  @Matches(PERMISSION_PART_PATTERN, {
    message: 'resource must contain lowercase letters, numbers, underscore or hyphen',
  })
  resource!: string;

  @IsString()
  @MaxLength(50)
  @Matches(PERMISSION_PART_PATTERN, {
    message: 'action must contain lowercase letters, numbers, underscore or hyphen',
  })
  action!: string;
}

export class RevokePermissionDto {
  @IsIn(ACTIVE_ROLES)
  role!: UserRole;

  @IsString()
  @MaxLength(100)
  @Matches(PERMISSION_NAME_PATTERN, {
    message: 'permissionName must be "*" or use resource.action format',
  })
  permissionName!: string;
}
