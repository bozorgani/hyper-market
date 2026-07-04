import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Response } from 'express';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { OrdersService } from '../services/orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotencyService.execute(
      `orders:create:${user.sub}`,
      idempotencyKey,
      { userId: user.sub, ...dto },
      () => this.ordersService.createOrder(user.sub, dto),
    );

    response.setHeader('Idempotency-Status', result.status);
    return result.data;
  }

  @Get('my')
  @Roles(UserRole.CUSTOMER)
  getMyOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (page || limit) {
      return this.ordersService.getMyOrdersPaginated(
        user.sub,
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
      );
    }
    return this.ordersService.getMyOrders(user.sub);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  listAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    if (page || limit) {
      const parsedStatus = this.toOptionalOrderStatus(status);
      return this.ordersService.listAllOrdersPaginated(
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
        parsedStatus,
      );
    }
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

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }

  private toOptionalOrderStatus(value: string | undefined): OrderStatus | undefined {
    if (!value) return undefined;
    const validStatuses = Object.values(OrderStatus);
    return validStatuses.includes(value as OrderStatus) ? (value as OrderStatus) : undefined;
  }
}
