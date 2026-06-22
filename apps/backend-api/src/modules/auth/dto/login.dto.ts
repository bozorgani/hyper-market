import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { AtLeastOne } from '../../../shared/validators/at-least-one.validator';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber?: string;

  @IsString()
  @AtLeastOne(['email', 'phoneNumber'], {
    message: 'At least one of email or phoneNumber is required',
  })
  password!: string;

  @IsString()
  deviceId!: string;
}
