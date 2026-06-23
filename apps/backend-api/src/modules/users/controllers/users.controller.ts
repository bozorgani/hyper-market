import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
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
}
