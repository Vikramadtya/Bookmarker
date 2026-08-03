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

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    // Client must send userId in handshake auth: socket({ auth: { userId } })
    const userId = client.handshake.auth?.userId as string;
    if (userId) {
      client.join(userId);
      this.logger.log(`Client connected: ${client.id} → room: ${userId}`);
    } else {
      this.logger.warn(
        `Client connected without userId — no room assigned: ${client.id}`,
      );
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
