import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { hash } from 'bcrypt';

@Injectable()
export class TokenService {
  private readonly hashRounds = 12;

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

  generateAccessToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpires as StringValue,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  generateRefreshToken(payload: object): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpires as StringValue,
      issuer: this.issuer,
      audience: this.audience,
    });
  }

  verifyToken(token: string): object {
    return this.jwtService.verify(token, {
      secret: this.accessSecret,
      issuer: this.issuer,
      audience: this.audience,
    }) as object;
  }

  async hashToken(token: string): Promise<string> {
    return hash(token, this.hashRounds);
  }
}
