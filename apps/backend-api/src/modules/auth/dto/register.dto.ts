import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../../infrastructure/security/password-policy.constant';
import { AtLeastOne } from '../../../shared/validators/at-least-one.validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber?: string;

  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  @AtLeastOne(['email', 'phoneNumber'], {
    message: 'At least one of email or phoneNumber is required',
  })
  password!: string;
}
