import { IsEnum, IsString, Matches } from 'class-validator';
import { OtpType } from '../enums/otp-type.enum';

export class VerifyOtpDto {
  @IsString()
  target!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsEnum(OtpType)
  type!: OtpType;
}
