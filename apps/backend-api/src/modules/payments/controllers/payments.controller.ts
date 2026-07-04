import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentsService } from '../services/payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('create')
  async createPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.idempotencyService.execute(
      `payments:create:${user.sub}`,
      idempotencyKey,
      { userId: user.sub, role: user.role, ...dto },
      () => this.paymentsService.createPaymentFromOrder(user.sub, user.role, dto),
    );

    response.setHeader('Idempotency-Status', result.status);
    return result.data;
  }

  @Get('batch')
  getPaymentsBatch(
    @CurrentUser() user: JwtPayload,
    @Query('orderIds') orderIds?: string,
  ) {
    const ids = orderIds
      ? orderIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    return this.paymentsService.findPaymentsByOrderIds(ids, user.sub, user.role);
  }

  @Get(':orderId')
  getPaymentByOrderId(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.verifyPayment(orderId, user.sub, user.role);
  }
}
