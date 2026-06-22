import { IsString, Matches } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
