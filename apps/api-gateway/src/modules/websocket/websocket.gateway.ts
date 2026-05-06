import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '../../common/logger';

type BroadcastPayload = Record<string, unknown>;

@WebSocketGateway({
  namespace: '/socket.io',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  },
})
export class EventGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    if (!this.isAuthorized(client)) {
      Logger.warn(`Unauthorized WebSocket client on /socket.io: ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    this.connectedClients.add(client.id);
    Logger.info(`WebSocket client connected: ${client.id}`);
    this.server.emit('client:connected', {
      totalClients: this.connectedClients.size,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    Logger.info(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:alerts')
  subscribeToAlerts(@ConnectedSocket() client: Socket) {
    client.join('alerts');
    return { event: 'subscribed', topic: 'alerts' };
  }

  @SubscribeMessage('subscribe:events')
  subscribeToEvents(@ConnectedSocket() client: Socket) {
    client.join('events');
    return { event: 'subscribed', topic: 'events' };
  }

  broadcastAlert(alertData: BroadcastPayload): void {
    this.server.to('alerts').emit('alert:new', alertData);
  }

  broadcastEvent(eventData: BroadcastPayload): void {
    this.server.to('events').emit('event:processed', eventData);
  }

  private isAuthorized(client: Socket): boolean {
    const expectedToken = process.env.WEBSOCKET_AUTH_TOKEN;
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // In production, authentication is always required
    if (nodeEnv === 'production' && !expectedToken) {
      Logger.warn('WebSocket auth not configured but NODE_ENV=production. This is a security risk.');
      return false;
    }

    // In development without token configured, allow all connections (insecure)
    if (!expectedToken) {
      Logger.warn('WebSocket running without authentication. This is insecure and should only be used in development.');
      return true;
    }

    const authToken =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '') ||
      (client.handshake.query.token as string | undefined);

    const isValid = authToken === expectedToken;
    
    if (!isValid) {
      Logger.warn(`WebSocket authentication failed for client ${client.id}`, {
        provided: authToken ? 'yes' : 'no',
        expected: 'yes',
      });
    }

    return isValid;
  }
}
