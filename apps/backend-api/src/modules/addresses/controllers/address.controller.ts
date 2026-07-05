import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';
import { AddressService } from '../services/address.service';

@Controller('addresses')
@Roles(UserRole.CUSTOMER)
export class AddressController {
  constructor(private readonly service: AddressService) {}

  @Get('my')
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.service.create(user.sub, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.update(user.sub, id, dto);
  }

  @Patch(':id/default')
  setDefault(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.setDefault(user.sub, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.sub, id);
  }
}
