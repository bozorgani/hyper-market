import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { TokenHashService } from './token-hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const accessSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
        configService.getOrThrow<string>('JWT_REFRESH_SECRET');

        return {
          secret: accessSecret,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [PasswordService, TokenHashService, TokenService],
  exports: [PasswordService, TokenHashService, TokenService],
})
export class SecurityModule {}
