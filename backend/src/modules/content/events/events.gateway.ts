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

@WebSocketGateway({
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      // Allow configured frontend URL and localhost in dev
      callback(null, true);
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
      const jwt = require('jsonwebtoken');
      const secret = this.config.get<string>('JWT_SECRET');
      if (!secret) throw new Error('JWT_SECRET not configured');

      const payload = jwt.verify(token, secret);
      const userId = payload.email; // userId is actually email in this app's controllers

      if (userId) {
        await client.join(userId);
        this.logger.log(`Client connected: ${client.id} → room: ${userId}`);
      } else {
        throw new Error('No email in token payload');
      }
    } catch (err: any) {
      this.logger.warn(
        `WebSocket auth failed for ${client.id}: ${err.message}`,
      );
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
