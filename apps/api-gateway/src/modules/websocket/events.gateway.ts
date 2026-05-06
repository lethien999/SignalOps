import {
  ConnectedSocket,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { Logger } from '../../common/logger';
import { websocketRetryService } from './websocket-retry.service';

export type EventEmissionPayload = {
  id: string;
  deviceId: string;
  location?: { lat: number; lng: number };
  metrics?: { latency?: number; packetLoss?: number; signalStrength?: number };
  timestamp: string;
  [key: string]: unknown;
};

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Namespace;

  private connectedClients = new Set<string>();
  private readonly lastEmissionAt = new Map<string, number>();
  private readonly emitMinIntervalMs = parseInt(
    process.env.WEBSOCKET_EMIT_MIN_INTERVAL_MS || '100',
    10,
  );

  afterInit(server: Namespace) {
    server.on('error', (error: unknown) => {
      Logger.error('Socket.IO server error on /events namespace', error);
    });
  }

  handleConnection(client: Socket) {
    if (!this.isAuthorized(client)) {
      Logger.warn(`Unauthorized WebSocket client on /events: ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    this.connectedClients.add(client.id);
    Logger.info(`WebSocket client connected to /events: ${client.id}`, {
      namespace: '/events',
      totalClients: this.connectedClients.size,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    Logger.info(`WebSocket client disconnected from /events: ${client.id}`, {
      namespace: '/events',
      totalClients: this.connectedClients.size,
    });
  }

  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: Socket) {
    Logger.info(`Client subscribed to events: ${client.id}`);
    return { event: 'subscribed', namespace: '/events' };
  }

  /**
   * Broadcast processed event to all connected clients
   */
  broadcastEventProcessed(payload: EventEmissionPayload): void {
    Logger.info('Broadcasting event:processed to /events namespace', {
      eventId: payload.id,
      deviceId: payload.deviceId,
      clientCount: this.connectedClients.size,
    });
    this.safeEmitToAll('event:processed', payload);
  }

  /**
   * Broadcast device status change to all connected clients
   */
  broadcastDeviceStatusChanged(payload: Record<string, unknown>): void {
    Logger.info('Broadcasting device:status:changed to /events namespace', {
      deviceId: payload.deviceId,
    });
    this.safeEmitToAll('device:status:changed', payload);
  }

  /**
   * Get current connection count (for monitoring)
   */
  getConnectionCount(): number {
    return this.connectedClients.size;
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

  private safeEmitToAll(event: string, payload: Record<string, unknown>): void {
    try {
      for (const socket of this.server.sockets.values()) {
        const key = `${socket.id}:${event}`;
        const now = Date.now();
        const previous = this.lastEmissionAt.get(key) || 0;

        if (now - previous < this.emitMinIntervalMs) {
          continue;
        }

        // Use retry service for emit with exponential backoff
        websocketRetryService.emitWithRetry(socket, event, payload).catch((error) => {
          Logger.error(`Failed to emit ${event} to socket ${socket.id} after all retries`, error);
        });
        this.lastEmissionAt.set(key, now);
      }
    } catch (error) {
      Logger.error(`Failed to emit ${event} on /events namespace`, error);
    }
  }
}
