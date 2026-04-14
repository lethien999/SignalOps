import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class EventBrokerService {
  private queue: Queue;
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });

    this.queue = new Queue(process.env.QUEUE_EVENT_PROCESSING || 'event-processing', {
      connection: this.redis,
    });
  }

  async queueEvent(eventData: any): Promise<void> {
    try {
      await this.queue.add('process-event', eventData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to queue event: ${errorMessage}`);
    }
  }

  getQueue(): Queue {
    return this.queue;
  }
}
