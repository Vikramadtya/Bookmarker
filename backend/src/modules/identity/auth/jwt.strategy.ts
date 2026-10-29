import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { AUTH_COOKIE } from '@core/config/app.config';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) =>
          (request?.cookies?.[AUTH_COOKIE] as string) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate({ id, email, username, name, picture }: AuthUser): AuthUser {
    return { id, email, username, name, picture };
  }
}
