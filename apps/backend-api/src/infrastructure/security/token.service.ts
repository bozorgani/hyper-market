import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private get accessSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('JWT_ACCESS_SECRET is not defined');
    }
    return secret;
  }

  private get refreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('JWT_REFRESH_SECRET is not defined');
    }
    return secret;
  }

  private get accessExpires(): string {
    return this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m');
  }

  private get refreshExpires(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES', '30d');
  }

  private get issuer(): string | undefined {
    return this.configService.get<string>('JWT_ISSUER') ?? undefined;
  }

  private get audience(): string | undefined {
    return this.configService.get<string>('JWT_AUDIENCE') ?? undefined;
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpires as StringValue,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpires as StringValue,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.accessSecret,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  verifyRefreshToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.refreshSecret,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  decodeToken(token: string): JwtPayload | null {
    const decoded = this.jwtService.decode(token);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    return decoded as JwtPayload;
  }
}
