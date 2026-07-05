import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { getEntityId } from '../../../shared/utils/entity-id.util';
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
    private readonly auditService: AuditService,
  ) {}

  @Post('create')
  async createPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const result = await this.idempotencyService.execute(
      `payments:create:${user.sub}`,
      idempotencyKey,
      { userId: user.sub, role: user.role, ...dto },
      () => this.paymentsService.createPaymentFromOrder(user.sub, user.role, dto),
    );

    response.setHeader('Idempotency-Status', result.status);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PAYMENT_CREATED,
      resource: 'payment',
      resourceId: getEntityId(result.data),
      metadata: { orderId: dto.orderId, amount: result.data.amount, status: result.data.status, method: result.data.method },
      request,
    });
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
