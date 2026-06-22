import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrdersService } from '../services/orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  createOrder(@CurrentUser() user: JwtPayload) {
    return this.ordersService.createOrder(user.sub);
  }

  @Get('my')
  @Roles(UserRole.CUSTOMER)
  getMyOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.getMyOrders(user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  listAllOrders() {
    return this.ordersService.listAllOrders();
  }

  @Get(':id')
  getOrderById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.getOrderById(id, user.sub, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions('orders.cancel')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
