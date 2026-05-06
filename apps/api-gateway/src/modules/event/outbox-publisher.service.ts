import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '../../common/logger';
import { OutboxRepository } from './repositories/outbox.repository';
import { EventBrokerService, TelemetryEventPayload } from './event-broker.service';

/**
 * Outbox Publisher Service
 * Implements the Outbox Pattern for idempotent event publishing
 * - Periodically checks for pending outbox events
 * - Publishes them to the queue
 * - Marks as published on success
 * - Records attempts on failure
 */
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private isPublishing = false;
  private readonly redisEnabled = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventBrokerService: EventBrokerService,
  ) {}

  async onModuleInit() {
    if (!this.redisEnabled) {
      Logger.debug('Outbox publisher disabled for local development');
      return;
    }

    const intervalMs = parseInt(process.env.OUTBOX_PUBLISH_INTERVAL_MS || '5000', 10);
    const maxAttempts = parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '3', 10);

    this.timer = setInterval(async () => {
      await this.publishPending(maxAttempts);
    }, intervalMs);

    Logger.info('Outbox publisher started', { intervalMs, maxAttempts });

    // Run immediately on startup
    await this.publishPending(maxAttempts);
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Publish all pending outbox events
   */
  private async publishPending(maxAttempts: number): Promise<void> {
    if (this.isPublishing) {
      return;
    }

    this.isPublishing = true;

    try {
      const events = await this.outboxRepository.findPendingEvents(100);

      if (events.length === 0) {
        return;
      }

      Logger.debug(`Publishing ${events.length} pending outbox events`);

      for (const event of events) {
        try {
          if (event.publishAttempts >= maxAttempts) {
            Logger.warn(`Outbox event ${event._id} exceeded max attempts (${maxAttempts}). Skipping.`);
            continue;
          }

          // Cast payload based on event type
          if (event.eventType === 'event') {
            const payload = event.payload as TelemetryEventPayload;
            await this.eventBrokerService.queueEvent(payload);
          }

          // Mark as published
          await this.outboxRepository.markAsPublished(event._id.toString());
          Logger.debug(`Published outbox event ${event._id}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await this.outboxRepository.recordPublishAttempt(event._id.toString(), errorMsg);
          Logger.warn(`Failed to publish outbox event ${event._id}. Attempt ${event.publishAttempts + 1}`, { error: errorMsg });
        }
      }

      // Clean up published events older than 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deleted = await this.outboxRepository.deletePublished(oneDayAgo);
      if (deleted > 0) {
        Logger.debug(`Cleaned up ${deleted} old published outbox events`);
      }
    } catch (error) {
      Logger.error('Error in outbox publisher', error);
    } finally {
      this.isPublishing = false;
    }
  }

  /**
   * Get current outbox status (for monitoring)
   */
  async getStatus(): Promise<{ pending: number }> {
    const pending = await this.outboxRepository.countPending();
    return { pending };
  }
}
