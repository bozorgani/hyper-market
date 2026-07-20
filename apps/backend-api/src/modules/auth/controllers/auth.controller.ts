import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
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
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../services/auth.service';
import { parseCookies } from '../../../shared/utils/parse-cookies';

const ACCESS_TOKEN_COOKIE = 'hyper_market_access_token';
const REFRESH_TOKEN_COOKIE = 'hyper_market_refresh_token';
const CSRF_TOKEN_COOKIE = 'hyper_market_csrf_token';

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
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.login(
      dto,
      this.getAuthContext(request, dto.deviceId),
    );
    this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    this.setCsrfCookie(response);
    return this.buildAuthResponse(tokens, 'login successful');
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 }, auth: { limit: 10, ttl: 60000 } })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto?.refreshToken ?? parseCookies(request)[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokens = await this.authService.refreshToken(
      refreshToken,
      this.getAuthContext(request),
    );
    this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    return this.buildAuthResponse(tokens, 'refresh successful');
  }

  @Post('logout')
  @Public()
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto?.refreshToken ?? parseCookies(request)[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      this.clearAuthCookies(response);
      return { message: 'logout successful' };
    }

    const result = await this.authService.logout(refreshToken, this.getAuthContext(request));
    this.clearAuthCookies(response);
    return result;
  }


  @Get('me')
  me(
    @CurrentUser() user: JwtPayload | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    this.setCsrfCookie(response);
    return this.authService.getCurrentUser(user);
  }

  @Get('csrf-token')
  @Public()
  getCsrfToken(@Res({ passthrough: true }) response: Response) {
    this.setCsrfCookie(response);
    return { success: true };
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


  private buildAuthResponse(
    tokens: { accessToken: string; refreshToken: string },
    message: string,
  ) {
    return { success: true, message };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.parseDurationMs(process.env.JWT_ACCESS_EXPIRES ?? '15m'),
    });

    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? '30d'),
    });
  }

  private clearAuthCookies(response: Response): void {
    const authOptions = this.getBaseCookieOptions();
    response.clearCookie(ACCESS_TOKEN_COOKIE, authOptions);
    response.clearCookie(REFRESH_TOKEN_COOKIE, authOptions);
    response.clearCookie(CSRF_TOKEN_COOKIE, this.getCsrfCookieOptions());
  }

  private setCsrfCookie(response: Response): void {
    response.cookie(
      CSRF_TOKEN_COOKIE,
      randomBytes(32).toString('hex'),
      this.getCsrfCookieOptions(),
    );
  }

  private getBaseCookieOptions(): CookieOptions {
    const sameSite = (process.env.AUTH_COOKIE_SAME_SITE ?? 'lax') as CookieOptions['sameSite'];
    const secure = process.env.AUTH_COOKIE_SECURE !== undefined
      ? process.env.AUTH_COOKIE_SECURE === 'true'
      : process.env.APP_ENV === 'production';

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    };
  }

  private getCsrfCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      httpOnly: false,
      maxAge: this.parseDurationMs(process.env.JWT_REFRESH_EXPIRES ?? '30d'),
    };
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
