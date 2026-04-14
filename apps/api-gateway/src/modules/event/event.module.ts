import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventBrokerService } from './event-broker.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
  ],
  controllers: [EventController],
  providers: [EventService, EventBrokerService],
  exports: [EventService, EventBrokerService],
})
export class EventModule {}
