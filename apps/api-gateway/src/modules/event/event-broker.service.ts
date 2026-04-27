import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Logger } from '../../common/logger';

type TelemetryLocation = {
  lat: number;
  lng: number;
  name?: string;
};

type TelemetryMetrics = {
  latency: number;
  packetLoss: number;
  signalStrength: number;
};

export type TelemetryEventPayload = {
  _id: string;
  deviceId: string;
  location: TelemetryLocation;
  metrics: TelemetryMetrics;
  timestamp?: Date;
};

@Injectable()
export class EventBrokerService {
  private queue: Queue;
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(process.env.QUEUE_EVENT_PROCESSING || 'event-processing', {
      connection: this.redis,
    });
  }

  async queueEvent(eventData: TelemetryEventPayload): Promise<string> {
    try {
      this.validateEventSchema(eventData);

      const jobId = this.buildJobId(eventData);
      const enrichedEvent = {
        ...eventData,
        timestamp: eventData.timestamp || new Date(),
        queueMetadata: {
          source: 'api-gateway',
          receivedAt: new Date().toISOString(),
          schemaVersion: '1.0.0',
        },
      };

      await this.queue.add('process-event', enrichedEvent, {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      Logger.info('Event queued', {
        jobId,
        eventId: eventData?._id || null,
        deviceId: eventData?.deviceId || null,
      });

      return jobId;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to queue event: ${errorMessage}`);
    }
  }

  private buildJobId(eventData: TelemetryEventPayload): string {
    const eventId = eventData?._id?.toString() || randomUUID();
    const deviceId = eventData?.deviceId || 'unknown-device';

    return `${deviceId}-${eventId}`;
  }

  private validateEventSchema(eventData: TelemetryEventPayload): void {
    if (!eventData || typeof eventData !== 'object') {
      throw new Error('eventData must be an object');
    }

    if (!eventData.deviceId || typeof eventData.deviceId !== 'string') {
      throw new Error('deviceId is required and must be a string');
    }

    const location = eventData.location;
    if (!location || typeof location !== 'object') {
      throw new Error('location is required and must be an object');
    }

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      throw new Error('location.lat and location.lng must be numbers');
    }

    const metrics = eventData.metrics;
    if (!metrics || typeof metrics !== 'object') {
      throw new Error('metrics is required and must be an object');
    }

    if (
      typeof metrics.latency !== 'number' ||
      typeof metrics.packetLoss !== 'number' ||
      typeof metrics.signalStrength !== 'number'
    ) {
      throw new Error('metrics.latency, metrics.packetLoss, and metrics.signalStrength must be numbers');
    }
  }

  getQueue(): Queue {
    return this.queue;
  }

  async isRedisHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
