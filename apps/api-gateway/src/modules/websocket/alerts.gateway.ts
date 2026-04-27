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

export type AlertEmissionPayload = {
  id: string;
  alertId: string;
  type: string;
  severity: string;
  location?: { lat: number; lng: number; name?: string };
  message: string;
  timestamp: string;
  deviceId?: string;
  [key: string]: unknown;
};

@WebSocketGateway({
  namespace: '/alerts',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
  },
})
export class AlertsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
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
      Logger.error('Socket.IO server error on /alerts namespace', error);
    });
  }

  handleConnection(client: Socket) {
    if (!this.isAuthorized(client)) {
      Logger.warn(`Unauthorized WebSocket client on /alerts: ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    this.connectedClients.add(client.id);
    Logger.info(`WebSocket client connected to /alerts: ${client.id}`, {
      namespace: '/alerts',
      totalClients: this.connectedClients.size,
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    Logger.info(`WebSocket client disconnected from /alerts: ${client.id}`, {
      namespace: '/alerts',
      totalClients: this.connectedClients.size,
    });
  }

  @SubscribeMessage('subscribe')
  subscribe(@ConnectedSocket() client: Socket) {
    Logger.info(`Client subscribed to alerts: ${client.id}`);
    return { event: 'subscribed', namespace: '/alerts' };
  }

  /**
   * Broadcast new alert to all connected clients
   */
  broadcastAlertNew(payload: AlertEmissionPayload): void {
    Logger.info('Broadcasting alert:new to /alerts namespace', {
      alertId: payload.id,
      severity: payload.severity,
      clientCount: this.connectedClients.size,
    });
    this.safeEmitToAll('alert:new', payload);
  }

  /**
   * Broadcast alert acknowledged to all connected clients
   */
  broadcastAlertAcknowledged(payload: AlertEmissionPayload): void {
    Logger.info('Broadcasting alert:acknowledged to /alerts namespace', {
      alertId: payload.id,
    });
    this.safeEmitToAll('alert:acknowledged', payload);
  }

  /**
   * Broadcast alert resolved to all connected clients
   */
  broadcastAlertResolved(payload: AlertEmissionPayload): void {
    Logger.info('Broadcasting alert:resolved to /alerts namespace', {
      alertId: payload.id,
    });
    this.safeEmitToAll('alert:resolved', payload);
  }

  /**
   * Get current connection count (for monitoring)
   */
  getConnectionCount(): number {
    return this.connectedClients.size;
  }

  private isAuthorized(client: Socket): boolean {
    const expectedToken = process.env.WEBSOCKET_AUTH_TOKEN;

    if (!expectedToken) {
      return true;
    }

    const authToken =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '') ||
      (client.handshake.query.token as string | undefined);

    return authToken === expectedToken;
  }

  private safeEmitToAll(event: string, payload: AlertEmissionPayload): void {
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
      Logger.error(`Failed to emit ${event} on /alerts namespace`, error);
    }
  }
}
