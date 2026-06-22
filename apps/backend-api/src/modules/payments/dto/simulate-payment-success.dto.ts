import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class SimulatePaymentSuccessDto {
  @IsMongoId()
  orderId!: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
