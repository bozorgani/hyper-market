import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET') || 'placeholder',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PasswordService, TokenService],
  exports: [PasswordService, TokenService],
})
export class SecurityModule {}
