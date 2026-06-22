import { IsEmail, IsOptional, Matches } from 'class-validator';
import { AtLeastOne } from '../../../shared/validators/at-least-one.validator';

export class ForgotPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/)
  @AtLeastOne(['email', 'phoneNumber'], {
    message: 'At least one of email or phoneNumber is required',
  })
  phoneNumber?: string;
}
