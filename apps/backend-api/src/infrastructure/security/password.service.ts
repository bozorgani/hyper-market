import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcrypt';
import { PASSWORD_POLICY_REGEX } from './password-policy.constant';

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
    return PASSWORD_POLICY_REGEX.test(password);
  }
}
