import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  constructor(private readonly configService: ConfigService) {}

  private get pepper(): string {
    return this.configService.get<string>('PASSWORD_PEPPER') ?? '';
  }

  private applyPepper(password: string): string {
    return `${password}${this.pepper}`;
  }

  async hashPassword(password: string): Promise<string> {
    return hash(this.applyPepper(password), this.saltRounds);
  }

  async comparePassword(plain: string, hashValue: string): Promise<boolean> {
    return compare(this.applyPepper(plain), hashValue);
  }

  validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumber &&
      hasSpecial
    );
  }
}
