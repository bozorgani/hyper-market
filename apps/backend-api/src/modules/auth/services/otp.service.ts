import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { Types } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { MailService } from '../../mail/mail.service';
import { SmsIrService } from '../../mail/sms-ir.service';
import { OtpType } from '../enums/otp-type.enum';
import { OtpRepository } from '../repositories/otp.repository';
import { OtpCode } from '../schemas/otp-code.schema';

type AuthContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
};

@Injectable()
export class OtpService {
  private readonly maxOtpAttempts = 5;
  private readonly lockoutMs = 15 * 60 * 1000;
  private readonly verificationOtpExpiresMs = 10 * 60 * 1000;
  private readonly passwordResetOtpExpiresMs = 10 * 60 * 1000;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly smsIrService: SmsIrService,
  ) {}

  async createVerificationOtp(
    userId: string,
    target: string,
    type: OtpType.EMAIL_VERIFY | OtpType.PHONE_VERIFY,
  ): Promise<void> {
    await this.createOtpForTarget(
      userId,
      target,
      type,
      this.verificationOtpExpiresMs,
    );
  }

  async createPasswordResetOtp(userId: string, target: string): Promise<void> {
    await this.createOtpForTarget(
      userId,
      target,
      OtpType.PASSWORD_RESET,
      this.passwordResetOtpExpiresMs,
    );
  }

  async verifyOtpCode(
    target: string,
    type: OtpType,
    code: string,
    context: AuthContext,
  ): Promise<OtpCode> {
    const otp = await this.otpRepository.findLatestForVerification(target, type);

    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const otpId = getEntityId(otp);
    const now = new Date();
    const lockKey = this.getOtpLockKey(target, type);
    const attemptsKey = this.getOtpAttemptsKey(target, type);

    if ((await this.redisService.exists(lockKey)) || (otp.blockedUntil && otp.blockedUntil > now)) {
      throw new ForbiddenException('OTP is temporarily blocked');
    }

    if (otp.expiresAt <= now) {
      throw new BadRequestException('OTP expired');
    }

    const redisAttempts = await this.getRedisOtpAttempts(attemptsKey, otp.attempts);
    if (redisAttempts >= this.maxOtpAttempts || otp.attempts >= this.maxOtpAttempts) {
      await this.blockOtpValidation(otpId, lockKey);
      throw new ForbiddenException('OTP is temporarily blocked');
    }

    const expectedCode = this.hashOtpCode(code);

    if (otp.codeHash !== expectedCode) {
      const updatedOtp = await this.otpRepository.incrementAttempts(otpId);
      const updatedAttempts = await this.incrementRedisOtpAttempts(
        attemptsKey,
        redisAttempts,
        otp.expiresAt,
      );
      if ((updatedOtp?.attempts ?? otp.attempts + 1) >= this.maxOtpAttempts || updatedAttempts >= this.maxOtpAttempts) {
        await this.blockOtpValidation(otpId, lockKey);
      }
      throw new BadRequestException('Invalid OTP');
    }

    await this.redisService.delete(attemptsKey);
    await this.redisService.delete(lockKey);
    await this.otpRepository.markVerified(otpId);

    return otp;
  }

  async markOtpVerified(otpId: string): Promise<void> {
    await this.otpRepository.markVerified(otpId);
  }

  async incrementOtpAttempts(otpId: string): Promise<void> {
    await this.otpRepository.incrementAttempts(otpId);
  }

  private async createOtpForTarget(
    userId: string,
    target: string,
    type: OtpType,
    expiresInMs: number,
  ): Promise<void> {
    const isDevelopmentOtp = process.env.NODE_ENV === 'development';
    const code = isDevelopmentOtp ? '123456' : this.generateOtpCode();

    await this.otpRepository.create({
      userId: new Types.ObjectId(userId),
      target,
      type,
      codeHash: this.hashOtpCode(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + expiresInMs),
    });

    if (isDevelopmentOtp) {
      console.info(`Development OTP for ${target}: ${code}`);
    }

    const ttl = Math.ceil(expiresInMs / 1000);
    await this.redisService.set(this.getOtpAttemptsKey(target, type), '0', ttl);
    await this.redisService.delete(this.getOtpLockKey(target, type));

    if (isDevelopmentOtp) {
      return;
    }

    if (this.isEmailTarget(target)) {
      if (type === OtpType.PASSWORD_RESET) {
        await this.mailService.sendPasswordResetEmail(target, code);
        return;
      }
      await this.mailService.sendOtpEmail(target, code);
      return;
    }

    await this.smsIrService.sendOtpSms(target, code);
  }

  private async getRedisOtpAttempts(
    attemptsKey: string,
    fallbackAttempts: number,
  ): Promise<number> {
    const attempts = await this.redisService.get(attemptsKey);
    if (attempts === null) {
      return fallbackAttempts;
    }
    return Number(attempts);
  }

  private async incrementRedisOtpAttempts(
    attemptsKey: string,
    currentAttempts: number,
    expiresAt: Date,
  ): Promise<number> {
    const updatedAttempts = currentAttempts + 1;
    const ttl = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    await this.redisService.set(attemptsKey, updatedAttempts.toString(), ttl);
    return updatedAttempts;
  }

  private async blockOtpValidation(otpId: string, lockKey: string): Promise<void> {
    await this.redisService.set(lockKey, '1', Math.ceil(this.lockoutMs / 1000));
    await this.otpRepository.blockOtp(otpId, this.getLockoutDate());
  }

  private getOtpAttemptsKey(target: string, type: OtpType): string {
    return `otp:attempts:${target}:${type}`;
  }

  private getOtpLockKey(target: string, type: OtpType): string {
    return `otp:lockout:${target}:${type}`;
  }

  private isEmailTarget(target: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  }

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtpCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private getLockoutDate(): Date {
    return new Date(Date.now() + this.lockoutMs);
  }

  // Public getters for external use
  getVerificationOtpExpiresMs(): number {
    return this.verificationOtpExpiresMs;
  }

  getPasswordResetOtpExpiresMs(): number {
    return this.passwordResetOtpExpiresMs;
  }
}