import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EventBrokerService } from './event-broker.service';
import { Logger } from '../../common/logger';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private eventBrokerService: EventBrokerService,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<{ id: string; status: string }> {
    try {
      const event = new this.eventModel(createEventDto);
      const savedEvent = await event.save();

      // Queue for async processing
      await this.eventBrokerService.queueEvent(savedEvent.toObject());

      Logger.info(`Event created and queued: ${savedEvent._id}`);
      return {
        id: savedEvent._id.toString(),
        status: 'queued',
      };
    } catch (error) {
      Logger.error('Failed to create event', error);
      throw error;
    }
  }

  async listEvents(skip: number, limit: number): Promise<any> {
    try {
      const events = await this.eventModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ timestamp: -1 })
        .exec();

      const total = await this.eventModel.countDocuments();

      return {
        data: events,
        pagination: { skip, limit, total },
      };
    } catch (error) {
      Logger.error('Failed to list events', error);
      throw error;
    }
  }

  async getEvent(id: string): Promise<Event> {
    try {
      const event = await this.eventModel.findById(id).exec();
      return event;
    } catch (error) {
      Logger.error(`Failed to get event ${id}`, error);
      throw error;
    }
  }
}
