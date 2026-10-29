import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '@identity/users/users.module';
import { jwtModuleOptions } from '@core/config/jwt.config';

@Module({
  imports: [UsersModule, JwtModule.registerAsync(jwtModuleOptions)],
  controllers: [AuthController],
  providers: [GoogleStrategy, JwtStrategy],
})
export class AuthModule {}
