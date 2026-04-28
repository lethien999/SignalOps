import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '../../common/logger';
import { EventsGateway } from './events.gateway';
import { AlertsGateway } from './alerts.gateway';

type EventProcessedMessage = {
  id: string;
  deviceId: string;
  location?: { lat: number; lng: number };
  metrics?: { latency?: number; packetLoss?: number; signalStrength?: number };
  timestamp: string;
  alertsCreated: number;
};

type AlertCreatedMessage = {
  id: string;
  alertId: string;
  type: string;
  severity: string;
  location?: { lat: number; lng: number; name?: string };
  message: string;
  timestamp: string;
  deviceId?: string;
};

@Injectable()
export class WebSocketPubSubListenerService implements OnModuleInit, OnModuleDestroy {
  private pubSubRedis?: Redis;
  private initialized = false;
  private readonly redisEnabled = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly alertsGateway: AlertsGateway,
  ) {}

  async onModuleInit() {
    if (!this.redisEnabled) {
      Logger.info('WebSocket Pub/Sub listener disabled for local development');
      return;
    }

    try {
      // Create a separate Redis connection for Pub/Sub (cannot reuse regular connections)
      this.pubSubRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
      });

      this.pubSubRedis.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      this.pubSubRedis.on('error', (error: unknown) => {
        Logger.error('Redis Pub/Sub listener error', error);
      });

      // Subscribe to channels
      await this.pubSubRedis.subscribe('events:processed', 'alerts:created');
      this.initialized = true;
      Logger.info('WebSocket Pub/Sub listener initialized and subscribed to channels', {
        channels: 'events:processed,alerts:created',
      });
    } catch (error) {
      this.initialized = false;
      Logger.warn('WebSocket Pub/Sub listener disabled because Redis is unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async onModuleDestroy() {
    if (this.pubSubRedis && this.initialized) {
      await this.pubSubRedis.unsubscribe();
      await this.pubSubRedis.quit();
      Logger.info('WebSocket Pub/Sub listener closed');
    }
  }

  private handleMessage(channel: string, message: string) {
    try {
      Logger.info(`Received message from Redis Pub/Sub channel: ${channel}`);

      if (channel === 'events:processed') {
        const payload = JSON.parse(message) as EventProcessedMessage;
        this.eventsGateway.broadcastEventProcessed({
          id: payload.id,
          deviceId: payload.deviceId,
          location: payload.location,
          metrics: payload.metrics,
          timestamp: payload.timestamp,
        });

        this.eventsGateway.broadcastDeviceStatusChanged({
          deviceId: payload.deviceId,
          status: payload.alertsCreated > 0 ? 'degraded' : 'normal',
          alertsCreated: payload.alertsCreated,
          timestamp: payload.timestamp,
        });
        return;
      }

      if (channel === 'alerts:created') {
        const payload = JSON.parse(message) as AlertCreatedMessage;
        this.alertsGateway.broadcastAlertNew(payload);
      }
    } catch (error) {
      Logger.error(`Error handling message from channel ${channel}`, error);
    }
  }
}
