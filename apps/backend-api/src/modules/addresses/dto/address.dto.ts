import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

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
  plate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/)
  postalCode?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends CreateAddressDto {}
