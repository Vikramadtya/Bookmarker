import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) => {
          // Fastify stores cookies on request.cookies (populated by @fastify/cookie)
          return (request?.cookies?.['auth_token'] as string) ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'bookmarker-super-secret-jwt-key',
      ),
    });
  }

  async validate(payload: { email: string; name: string; picture?: string }) {
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }
}
