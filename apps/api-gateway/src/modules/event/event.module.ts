import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventController } from './event.controller';
import { DeviceController } from './device.controller';
import { DlqController } from './dlq.controller';
import { EventService } from './event.service';
import { EventBrokerService } from './event-broker.service';
import { EventRepository } from './repositories/event.repository';
import { WebSocketModule } from '../websocket/websocket.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    WebSocketModule,
    AdminModule,
  ],
  controllers: [EventController, DeviceController, DlqController],
  providers: [EventService, EventBrokerService, EventRepository],
  exports: [EventService, EventBrokerService, EventRepository],
})
export class EventModule {}
