import { BadRequestException, Injectable } from '@nestjs/common';
import { Event } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EventBrokerService, TelemetryEventPayload } from './event-broker.service';
import { Logger } from '../../common/logger';
import { EventCreateInput, EventFindFilters, EventRepository } from './repositories/event.repository';

type EventListResult = {
  data: Event[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
  };
};

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly eventBrokerService: EventBrokerService,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
  ): Promise<{ id: string; status: string; jobId: string }> {
    try {
      const savedEvent = await this.eventRepository.save(createEventDto as EventCreateInput);

      // Queue for async processing
      const queuedEvent: TelemetryEventPayload = {
        ...(savedEvent.toObject() as Omit<TelemetryEventPayload, '_id'>),
        _id: savedEvent._id.toString(),
      };

      const jobId = await this.eventBrokerService.queueEvent(queuedEvent);

      Logger.info(`Event created and queued: ${savedEvent._id}`);
      return {
        id: savedEvent._id.toString(),
        status: 'queued',
        jobId,
      };
    } catch (error) {
      Logger.error('Failed to create event', error);
      throw error;
    }
  }

  async listEvents(filters: EventFindFilters): Promise<EventListResult> {
    try {
      const { data, total } = await this.eventRepository.find(filters);

      return {
        data,
        pagination: {
          skip: filters.skip,
          limit: filters.limit,
          total,
        },
      };
    } catch (error) {
      Logger.error('Failed to list events', error);
      throw error;
    }
  }

  async getEvent(id: string): Promise<Event | null> {
    try {
      const event = await this.eventRepository.findById(id);
      return event;
    } catch (error) {
      Logger.error(`Failed to get event ${id}`, error);
      throw error;
    }
  }

  parseEventFilters(params: {
    skip: number;
    limit: number;
    deviceId?: string;
    startDate?: string;
    endDate?: string;
  }): EventFindFilters {
    const limit = Math.min(Math.max(params.limit, 1), 200);
    const filters: EventFindFilters = {
      skip: Math.max(params.skip, 0),
      limit,
    };

    if (params.deviceId) {
      filters.deviceId = params.deviceId;
    }

    if (params.startDate) {
      filters.startDate = this.parseDateParam(params.startDate, 'startDate');
    }

    if (params.endDate) {
      filters.endDate = this.parseDateParam(params.endDate, 'endDate');
    }

    return filters;
  }

  async countTotalEvents(): Promise<number> {
    return this.eventRepository.countAll();
  }

  async countEventsPerMinute(): Promise<number> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 1000);
    return this.eventRepository.countEventsWithinPeriod(startDate, endDate);
  }

  private parseDateParam(value: string, name: 'startDate' | 'endDate'): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${name} must be a valid ISO date string`);
    }

    return parsedDate;
  }

  /**
   * E1: Derive device list from recent events (group by deviceId, take latest)
   */
  async getDevices() {
    const recentEvents = await this.eventRepository.findRecent(500);

    const deviceMap = new Map<string, {
      id: string;
      name: string;
      location: { lat: number; lng: number; name?: string };
      status: string;
      lastSeen: string;
      metrics: Record<string, number>;
    }>();

    for (const ev of recentEvents) {
      const existing = deviceMap.get(ev.deviceId);
      const evTime = ev.createdAt ? new Date(ev.createdAt).getTime() : 0;
      const existingTime = existing ? new Date(existing.lastSeen).getTime() : 0;

      if (!existing || evTime > existingTime) {
        const isAlert = (ev.metrics?.latency > 200) || (ev.metrics?.packetLoss > 5) || (ev.metrics?.signalStrength < -90);
        deviceMap.set(ev.deviceId, {
          id: ev.deviceId,
          name: ev.location?.name || ev.deviceId,
          location: ev.location || { lat: 0, lng: 0 },
          status: isAlert ? 'alert' : 'active',
          lastSeen: ev.createdAt?.toISOString() || new Date().toISOString(),
          metrics: {
            latency: ev.metrics?.latency || 0,
            packetLoss: ev.metrics?.packetLoss || 0,
            signalStrength: ev.metrics?.signalStrength || 0,
          },
        });
      }
    }

    return Array.from(deviceMap.values());
  }
}
