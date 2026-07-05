import { IsString, Matches, MaxLength } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Coupon code may only contain letters, numbers, underscore or hyphen',
  })
  code!: string;
}
