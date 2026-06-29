import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SendVerificationOtpDto } from '../dto/send-verification-otp.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { VerifyPhoneDto } from '../dto/verify-phone.dto';
import { Public } from '../decorators/public.decorator';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('send-verification-otp')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  sendVerificationOtp(@Body() dto: SendVerificationOtpDto) {
    return this.authService.sendVerificationOtp(dto);
  }

  @Post('verify-email')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyEmail(dto, this.getAuthContext(request));
  }

  @Post('verify-phone')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  verifyPhone(@Body() dto: VerifyPhoneDto, @Req() request: Request) {
    return this.authService.verifyPhone(dto, this.getAuthContext(request));
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getAuthContext(request, dto.deviceId));
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 }, auth: { limit: 10, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refreshToken(
      dto.refreshToken,
      this.getAuthContext(request),
    );
  }

  @Post('logout')
  @Public()
  logout(@Body() dto: LogoutDto, @Req() request: Request) {
    return this.authService.logout(dto.refreshToken, this.getAuthContext(request));
  }

  @Post('verify-otp')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 }, auth: { limit: 5, ttl: 60000 } })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() request: Request) {
    return this.authService.verifyOtp(dto, this.getAuthContext(request));
  }

  @Post('forgot-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 }, auth: { limit: 3, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 }, auth: { limit: 3, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() request: Request) {
    return this.authService.resetPassword(dto, this.getAuthContext(request));
  }

  private getAuthContext(request: Request, deviceId?: string) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent') ?? null,
      deviceId,
    };
  }
}
