import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventBrokerService } from '../event/event-broker.service';
import { EventService } from '../event/event.service';
import { AlertService } from '../alert/alert.service';

type ConnectionStatus = 'up' | 'down';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly mongooseConnection: Connection,
    private readonly eventBrokerService: EventBrokerService,
    private readonly eventService: EventService,
    private readonly alertService: AlertService,
  ) {}

  async getHealth() {
    const mongoStatus = this.resolveMongoStatus(this.mongooseConnection.readyState);
    const redisHealthy = await this.eventBrokerService.isRedisHealthy();

    return {
      status: mongoStatus === 'up' && redisHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        mongodb: mongoStatus,
        redis: redisHealthy ? 'up' : 'down',
      },
    };
  }

  async getStats() {
    const [totalEvents, activeAlerts, eventsPerMinute] = await Promise.all([
      this.eventService.countTotalEvents(),
      this.alertService.countActiveAlerts(),
      this.eventService.countEventsPerMinute(),
    ]);

    return {
      totalEvents,
      activeAlerts,
      eventsPerMinute,
      timestamp: new Date().toISOString(),
    };
  }

  private resolveMongoStatus(readyState: number): ConnectionStatus {
    return readyState === 1 ? 'up' : 'down';
  }
}