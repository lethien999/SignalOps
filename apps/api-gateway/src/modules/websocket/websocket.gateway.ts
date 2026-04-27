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
}
