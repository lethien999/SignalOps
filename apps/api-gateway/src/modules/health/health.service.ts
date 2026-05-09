import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventBrokerService } from '../event/event-broker.service';
import { EventService } from '../event/event.service';
import { AlertService } from '../alert/alert.service';
import { InfrastructureObservability } from './infrastructure-observability';

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
    const memUsage = process.memoryUsage();

    return {
      status: mongoStatus === 'up' && redisHealthy ? 'ok' : 'degraded',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node: process.version,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
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

    const [costMetrics, scaleStatus] = await Promise.all([
      InfrastructureObservability.getCostSnapshot(this.mongooseConnection, 'day'),
      InfrastructureObservability.getScaleStatus(this.mongooseConnection),
    ]);

    return {
      totalEvents,
      activeAlerts,
      eventsPerMinute,
      costMetrics,
      scaleStatus,
      timestamp: new Date().toISOString(),
    };
  }

  private resolveMongoStatus(readyState: number): ConnectionStatus {
    return readyState === 1 ? 'up' : 'down';
  }
}