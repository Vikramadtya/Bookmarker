import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { OAuthService } from './oauth.service';
import { OrganizeService } from './organize.service';
import { buildMcpServer } from './mcp-server';

/** The connector Claude talks to (MCP over Streamable HTTP, one request at a time). */
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  private readonly handler: ReturnType<typeof createMcpHandler>;

  constructor(
    private readonly oauth: OAuthService,
    organize: OrganizeService,
  ) {
    this.handler = createMcpHandler((ctx) =>
      buildMcpServer(organize, String(ctx.authInfo?.extra?.sessionId)),
    );
  }

  @All()
  // Claude's requests come from a few shared addresses, so the limit is generous.
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  async serve(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const origin = req.headers.origin;
    if (
      origin &&
      ![this.oauth.issuer, 'https://claude.ai', 'https://claude.com'].includes(
        origin,
      )
    )
      return reply.status(403).send({ error: 'forbidden_origin' });

    const token = /^Bearer\s+(\S+)$/i.exec(
      req.headers.authorization ?? '',
    )?.[1];
    const session = token ? await this.oauth.sessionForToken(token) : null;
    if (!session) {
      // This header is how Claude discovers where to sign in.
      const metadata = `${this.oauth.issuer}/.well-known/oauth-protected-resource`;
      return reply
        .status(401)
        .header(
          'www-authenticate',
          `Bearer resource_metadata="${metadata}"${token ? ', error="invalid_token"' : ''}`,
        )
        .send({ error: 'unauthorized' });
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string' && key !== 'authorization')
        headers.set(key, value);
    }
    headers.delete('content-length');
    const hasBody = req.method === 'POST';
    const response = await this.handler.fetch(
      new Request(this.oauth.resource, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
      }),
      {
        parsedBody: hasBody ? req.body : undefined,
        authInfo: {
          token: token!,
          clientId: 'claude',
          scopes: ['organize'],
          extra: { sessionId: session._id },
        },
      },
    );
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.status(response.status).send(await response.text());
  }
}
