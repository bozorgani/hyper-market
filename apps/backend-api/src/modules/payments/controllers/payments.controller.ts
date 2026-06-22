import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { SimulatePaymentSuccessDto } from '../dto/simulate-payment-success.dto';
import { PaymentsService } from '../services/payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  createPayment(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPaymentFromOrder(user.sub, user.role, dto);
  }

  @Post('simulate-success')
  simulatePaymentSuccess(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimulatePaymentSuccessDto,
  ) {
    return this.paymentsService.simulatePaymentSuccess(
      user.sub,
      user.role,
      dto.orderId,
      dto.transactionId,
    );
  }

  @Get(':orderId')
  getPaymentByOrderId(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.verifyPayment(orderId, user.sub, user.role);
  }
}
