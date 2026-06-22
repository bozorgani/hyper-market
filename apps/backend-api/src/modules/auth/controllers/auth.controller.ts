import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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

const AUTH_RATE_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('send-verification-otp')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  sendVerificationOtp(@Body() dto: SendVerificationOtpDto) {
    return this.authService.sendVerificationOtp(dto);
  }

  @Post('verify-email')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyEmail(dto, this.getAuthContext(request));
  }

  @Post('verify-phone')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  verifyPhone(@Body() dto: VerifyPhoneDto, @Req() request: Request) {
    return this.authService.verifyPhone(dto, this.getAuthContext(request));
  }

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getAuthContext(request, dto.deviceId));
  }

  @Post('refresh')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
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
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() request: Request) {
    return this.authService.verifyOtp(dto, this.getAuthContext(request));
  }

  @Post('forgot-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_RATE_LIMIT)
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
