import { Module } from '@nestjs/common';
import { EventGateway } from './websocket.gateway';

@Module({
  providers: [EventGateway],
  exports: [EventGateway],
})
export class WebSocketModule {}
