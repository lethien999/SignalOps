import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { OutboxEvent, OutboxEventSchema } from './schemas/outbox-event.schema';
import { DeviceMaintenance, DeviceMaintenanceSchema } from './schemas/device-maintenance.schema';
import { EventController } from './event.controller';
import { DeviceController } from './device.controller';
import { DlqController } from './dlq.controller';
import { EventService } from './event.service';
import { EventBrokerService } from './event-broker.service';
import { OutboxPublisherService } from './outbox-publisher.service';
import { EventRepository } from './repositories/event.repository';
import { OutboxRepository } from './repositories/outbox.repository';
import { DeviceMaintenanceRepository } from './repositories/device-maintenance.repository';
import { WebSocketModule } from '../websocket/websocket.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: OutboxEvent.name, schema: OutboxEventSchema },
      { name: DeviceMaintenance.name, schema: DeviceMaintenanceSchema },
    ]),
    WebSocketModule,
    AdminModule,
  ],
  controllers: [EventController, DeviceController, DlqController],
  providers: [
    EventService,
    EventBrokerService,
    OutboxPublisherService,
    EventRepository,
    OutboxRepository,
    DeviceMaintenanceRepository,
  ],
  exports: [EventService, EventBrokerService, EventRepository, OutboxRepository, DeviceMaintenanceRepository],
})
export class EventModule {}
