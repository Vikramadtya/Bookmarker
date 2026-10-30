import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE } from '@core/config/app.config';

const frontendOrigin = () =>
  process.env.FRONTEND_URL || 'http://localhost:5173';
const isProd = () => process.env.NODE_ENV === 'production';

function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}

// Browsers always send Origin, so checking it blocks cross-site WebSocket
// hijacking. Non-browser clients (no Origin) cannot ride on a victim's cookies.
const isOriginAllowed = (origin: string | undefined) =>
  !origin ||
  origin === frontendOrigin() ||
  (!isProd() && origin.startsWith('http://localhost'));

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => callback(null, isOriginAllowed(origin)),
    credentials: true,
  },
  // CORS settings are not applied to WebSocket upgrade requests, so check there too.
  allowRequest: (
    req: { headers: { origin?: string } },
    callback: (err: string | null, ok: boolean) => void,
  ) => callback(null, isOriginAllowed(req.headers.origin)),
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const cookie = readCookie(client.handshake.headers.cookie, AUTH_COOKIE);
    const handshakeToken = client.handshake.auth?.token;
    try {
      const token = cookie || handshakeToken;
      if (!token) throw new Error('missing auth token');
      const { email, purpose } = await this.jwt.verifyAsync<{
        email?: string;
        purpose?: string;
      }>(token);
      if (!email) throw new Error('no email in token');
      // A handshake token must be the short-lived socket one, not a session JWT.
      if (!cookie && purpose !== 'socket') throw new Error('wrong token type');
      await client.join(email);
    } catch (err) {
      this.logger.warn(
        `WebSocket auth failed for ${client.id}: ${(err as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Emit only to the room of the user who owns the bookmark. */
  emitBookmarkUpdated(
    userId: string,
    bookmarkId: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(userId).emit('bookmarkUpdated', { bookmarkId, ...payload });
  }
}
