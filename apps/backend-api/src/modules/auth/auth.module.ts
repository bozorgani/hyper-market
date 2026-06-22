import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { OtpCode, OtpCodeSchema } from './schemas/otp-code.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { AuthService } from './services/auth.service';
import { OtpRepository } from './repositories/otp.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { SessionRepository } from './repositories/session.repository';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Session.name, schema: SessionSchema },
      { name: OtpCode.name, schema: OtpCodeSchema },
    ]),
  ],
  providers: [
    AuthService,
    RefreshTokenRepository,
    SessionRepository,
    OtpRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
