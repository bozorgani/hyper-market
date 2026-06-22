import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { AtLeastOne } from '../../../shared/validators/at-least-one.validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/)
  phoneNumber?: string;

  @IsString()
  @Length(8, 100)
  @AtLeastOne(['email', 'phoneNumber'], {
    message: 'At least one of email or phoneNumber is required',
  })
  password!: string;
}
