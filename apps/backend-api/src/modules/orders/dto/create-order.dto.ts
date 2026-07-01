import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DeliveryAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recipientName!: string;

  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  addressLine!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  plate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/)
  postalCode?: string;
}

export class DeliveryWindowDto {
  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
  timeSlot!: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;

  @ValidateNested()
  @Type(() => DeliveryWindowDto)
  deliveryWindow!: DeliveryWindowDto;
}
