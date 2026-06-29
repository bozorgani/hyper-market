import { Injectable, OnModuleInit } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { PASSWORD_POLICY_REGEX } from './password-policy.constant';

@Injectable()
export class PasswordService implements OnModuleInit {
  private readonly saltRounds = 12;
  private pepper: string = '';

  onModuleInit() {
    // Access pepper directly from process.env for better security isolation
    this.pepper = process.env.PASSWORD_PEPPER ?? '';

    if (!this.pepper) {
      console.warn(
        '[SECURITY WARNING] PASSWORD_PEPPER is not set. ' +
        'Passwords will be hashed without pepper. This is strongly discouraged in production.',
      );
    }

    if (process.env.APP_ENV === 'production' && !this.pepper) {
      throw new Error('PASSWORD_PEPPER must be set in production environment');
    }
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
