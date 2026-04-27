import { Module } from '@nestjs/common';
import { AlertsGateway } from './alerts.gateway';
import { EventsGateway } from './events.gateway';
import { StatusGateway } from './status.gateway';
import { WebSocketPubSubListenerService } from './websocket-pubsub-listener.service';
import { WebSocketStatusMonitorService } from './websocket-status-monitor.service';

@Module({
  providers: [
    AlertsGateway,
    EventsGateway,
    StatusGateway,
    WebSocketPubSubListenerService,
    WebSocketStatusMonitorService,
  ],
  exports: [AlertsGateway, EventsGateway, StatusGateway],
})
export class WebSocketModule {}
