import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { OAuthError, OAuthService } from './oauth.service';

/** Public OAuth endpoints. Responses follow the OAuth specs, not the app's error shape. */
@ApiExcludeController()
@Controller()
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Get([
    '.well-known/oauth-protected-resource',
    '.well-known/oauth-protected-resource/mcp',
  ])
  resourceMetadata() {
    return this.oauth.resourceMetadata();
  }

  @Get('.well-known/oauth-authorization-server')
  serverMetadata() {
    return this.oauth.serverMetadata();
  }

  @Post('oauth/register')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async register(
    @Body() body: Record<string, unknown>,
    @Res() reply: FastifyReply,
  ) {
    await this.answer(reply, 201, () => this.oauth.register(body));
  }

  @Get('oauth/authorize')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async authorize(
    @Query() query: Record<string, string>,
    @Res() reply: FastifyReply,
  ) {
    try {
      const location = await this.oauth.startAuthorization(query);
      await reply.status(302).header('location', location).send();
    } catch (e) {
      await this.fail(reply, e);
    }
  }

  @Post('oauth/token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async token(
    @Body() body: Record<string, string>,
    @Res() reply: FastifyReply,
  ) {
    await this.answer(reply, 200, () => this.oauth.exchange(body ?? {}));
  }

  private async answer(
    reply: FastifyReply,
    status: number,
    work: () => Promise<unknown>,
  ) {
    try {
      const result = await work();
      await reply
        .status(status)
        .header('cache-control', 'no-store')
        .send(result);
    } catch (e) {
      await this.fail(reply, e);
    }
  }

  private async fail(reply: FastifyReply, e: unknown) {
    if (!(e instanceof OAuthError)) throw e;
    await reply
      .status(e.status)
      .header('cache-control', 'no-store')
      .send({ error: e.error, error_description: e.message });
  }
}
