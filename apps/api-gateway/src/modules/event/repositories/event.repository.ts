import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Event } from '../schemas/event.schema';

export type EventFindFilters = {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
  skip: number;
  limit: number;
};

export type EventCreateInput = {
  deviceId: string;
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };
  timestamp?: Date;
};

@Injectable()
export class EventRepository {
  constructor(@InjectModel(Event.name) private readonly eventModel: Model<Event>) {}

  async save(payload: EventCreateInput): Promise<Event> {
    const event = new this.eventModel(payload);
    return event.save();
  }

  async findById(id: string): Promise<Event | null> {
    return this.eventModel.findById(id).exec();
  }

  async find(filters: EventFindFilters): Promise<{ data: Event[]; total: number }> {
    const query = this.buildQuery(filters);
    const hasFilters = this.hasFilters(query);

    const dataPromise = this.eventModel
      .find(query)
      .select('deviceId location metrics timestamp processedAt alertId createdAt updatedAt')
      .skip(filters.skip)
      .limit(filters.limit)
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    const totalPromise = hasFilters
      ? this.eventModel.countDocuments(query)
      : this.eventModel.estimatedDocumentCount();

    const [data, total] = await Promise.all([dataPromise, totalPromise]);

    return { data: data as unknown as Event[], total };
  }

  async findByDeviceId(deviceId: string, skip: number, limit: number): Promise<Event[]> {
    return this.eventModel
      .find({ deviceId })
      .skip(skip)
      .limit(limit)
      .sort({ timestamp: -1 })
      .exec();
  }

  async countEventsWithinPeriod(startDate: Date, endDate: Date): Promise<number> {
    return this.eventModel.countDocuments({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  async countAll(): Promise<number> {
    return this.eventModel.countDocuments();
  }

  async findRecent(limit: number): Promise<Event[]> {
    return this.eventModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Event[];
  }

  /**
   * Optimized: Get latest event per device using MongoDB aggregation
   * Avoids in-memory processing of 500+ events
   */
  async findLatestEventPerDevice(limit: number = 500): Promise<Event[]> {
    const result = await this.eventModel
      .aggregate([
        // Sort by createdAt descending to get latest events first
        { $sort: { createdAt: -1 } },
        // Group by deviceId, keeping first (latest) event per device
        {
          $group: {
            _id: '$deviceId',
            event: { $first: '$$ROOT' },
          },
        },
        // Limit to specified number of devices
        { $limit: limit },
        // Replace root with the event document
        { $replaceRoot: { newRoot: '$event' } },
        // Sort final results by createdAt descending
        { $sort: { createdAt: -1 } },
      ])
      .exec();

    return result as unknown as Event[];
  }

  private buildQuery(filters: EventFindFilters): FilterQuery<Event> {
    const query: FilterQuery<Event> = {};

    if (filters.deviceId) {
      query.deviceId = filters.deviceId;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};

      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }

      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    return query;
  }

  private hasFilters(query: FilterQuery<Event>): boolean {
    return Object.keys(query).length > 0;
  }
}
