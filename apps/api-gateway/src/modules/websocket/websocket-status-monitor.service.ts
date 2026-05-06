import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Logger } from '../../common/logger';
import { getRedisConfig } from '../../common/redis.config';
import { StatusGateway } from './status.gateway';

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

@Injectable()
export class WebSocketStatusMonitorService implements OnModuleInit, OnModuleDestroy {
  private redis?: Redis;
  private queue?: Queue;
  private timer: NodeJS.Timeout | null = null;
  private previousCompleted = 0;
  private previousEmitAt = Date.now();
  private readonly redisEnabled = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

  constructor(private readonly statusGateway: StatusGateway) {}

  async onModuleInit() {
    if (!this.redisEnabled) {
      Logger.info('WebSocket status monitor disabled for local development');
      return;
    }

    this.redis = new Redis(getRedisConfig());

    this.redis.on('error', (error: unknown) => {
      Logger.error('WebSocket status monitor Redis error', error);
    });

    const queueName = process.env.QUEUE_EVENT_PROCESSING || 'event-processing';
    this.queue = new Queue(queueName, { connection: this.redis });

    const intervalMs = parseInt(process.env.WEBSOCKET_STATUS_BROADCAST_INTERVAL_MS || '5000', 10);
    this.timer = setInterval(() => {
      void this.broadcastStatus();
    }, intervalMs);

    Logger.info('WebSocket status monitor started', {
      queueName,
      intervalMs,
    });
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.queue) {
      await this.queue.close();
    }

    if (this.redis) {
      await this.redis.quit();
    }

    Logger.info('WebSocket status monitor stopped');
  }

  private async broadcastStatus(): Promise<void> {
    try {
      if (!this.queue) {
        return;
      }

      const counts = await this.queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );

      const normalized: QueueCounts = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      };

      const depth = normalized.waiting + normalized.active + normalized.delayed;
      this.statusGateway.broadcastQueueDepth({
        queue: this.queue.name,
        depth,
        ...normalized,
        timestamp: new Date().toISOString(),
      });

      const now = Date.now();
      const elapsedSeconds = Math.max((now - this.previousEmitAt) / 1000, 1);
      const completedDelta = Math.max(normalized.completed - this.previousCompleted, 0);
      const processedPerSecond = Number((completedDelta / elapsedSeconds).toFixed(2));

      this.statusGateway.broadcastWorkerStats({
        queue: this.queue.name,
        processedPerSecond,
        activeJobs: normalized.active,
        failedJobs: normalized.failed,
        connectedStatusClients: this.statusGateway.getConnectionCount(),
        timestamp: new Date().toISOString(),
      });

      this.previousCompleted = normalized.completed;
      this.previousEmitAt = now;
    } catch (error) {
      Logger.error('Failed to broadcast websocket status metrics', error);
    }
  }
}
