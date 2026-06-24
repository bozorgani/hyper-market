import { Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../services/users.service';

@Controller('users')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserByIdOrFail(id);
  }

  @Patch(':id/block')
  @Permissions('users.ban')
  blockUser(@Param('id') id: string) {
    return this.usersService.blockUser(id);
  }

  @Patch(':id/unblock')
  @Permissions('users.ban')
  unblockUser(@Param('id') id: string) {
    return this.usersService.unblockUser(id);
  }
}
