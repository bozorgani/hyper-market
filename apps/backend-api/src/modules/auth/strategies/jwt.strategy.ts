import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/services/users.service';
import { AccountStatus } from '../../users/enums/account-status.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const ACCESS_TOKEN_COOKIE = 'hyper_market_access_token';

function extractJwtFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey === ACCESS_TOKEN_COOKIE) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: configService.get<string>('JWT_ISSUER'),
      audience: configService.get<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Role / permission / ban changes are only reflected after a token-version
    // bump (logout / password reset). Re-read the user so guards enforce the
    // CURRENT role and account status instead of the (possibly stale) claims
    // baked into the token when it was issued.
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid token version');
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      sub: payload.sub,
      role: user.role,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      tokenVersion: user.tokenVersion,
      jti: payload.jti,
    };
  }
}
