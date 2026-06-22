import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @IsMongoId()
  orderId!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
