import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';

@Controller('users')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.read')
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  @Permissions('users.read')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserByIdOrFail(id);
  }

  @Patch(':id/block')
  @Permissions('users.ban')
  blockUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.blockUser(id, user.sub);
  }

  @Patch(':id/unblock')
  @Permissions('users.ban')
  unblockUser(@Param('id') id: string) {
    return this.usersService.unblockUser(id);
  }
}
