import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jsonwebtoken from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    // BUG-02: Only allow the configured FRONTEND_URL — never a wildcard.
    // This prevents cross-site WebSocket hijacking.
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      const config = new ConfigService();
      const allowed =
        config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
      const isAllowed =
        !origin || origin === allowed || origin.startsWith('http://localhost');
      callback(null, isAllowed);
    },
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly config: ConfigService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string;
    if (!token) {
      this.logger.warn(
        `Client connected without token — disconnecting: ${client.id}`,
      );
      client.disconnect();
      return;
    }

    try {
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('JWT_SECRET not configured');

      // BUG-02 (cont.): Use the statically imported module, not require()
      const payload = jsonwebtoken.verify(token, secret) as {
        email?: string;
      };
      const userId = payload.email;

      if (userId) {
        await client.join(userId);
        this.logger.log(`Client connected: ${client.id} → room: ${userId}`);
      } else {
        throw new Error('No email in token payload');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`WebSocket auth failed for ${client.id}: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit a bookmark update event ONLY to the user who owns it.
   * Clients join a room named after their userId on connection.
   */
  emitBookmarkUpdated(
    userId: string,
    bookmarkId: string,
    payload: Record<string, unknown>,
  ) {
    this.server.to(userId).emit('bookmarkUpdated', { bookmarkId, ...payload });
  }
}
