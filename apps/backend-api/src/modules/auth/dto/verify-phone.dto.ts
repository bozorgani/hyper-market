import { IsString, Matches } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
