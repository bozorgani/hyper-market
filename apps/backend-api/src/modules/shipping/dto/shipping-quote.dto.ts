import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ShippingMethod } from '../enums/shipping-method.enum';

export class ShippingAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;
}

export class ShippingWindowDto {
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
  timeSlot!: string;
}

export class ShippingQuoteDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  address!: ShippingAddressDto;

  @ValidateNested()
  @Type(() => ShippingWindowDto)
  deliveryWindow!: ShippingWindowDto;

  @IsOptional()
  @IsEnum(ShippingMethod)
  method?: ShippingMethod;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/)
  couponCode?: string;
}
