import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventBrokerService } from './event-broker.service';
import { EventRepository } from './repositories/event.repository';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    WebSocketModule,
  ],
  controllers: [EventController],
  providers: [EventService, EventBrokerService, EventRepository],
  exports: [EventService, EventBrokerService, EventRepository],
})
export class EventModule {}
