import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OutboxEvent } from '../schemas/outbox-event.schema';

export type CreateOutboxEventInput = {
  eventType: 'event' | 'alert';
  payload: Record<string, any>;
};

@Injectable()
export class OutboxRepository {
  constructor(@InjectModel(OutboxEvent.name) private readonly model: Model<OutboxEvent>) {}

  async create(input: CreateOutboxEventInput): Promise<OutboxEvent> {
    const doc = new this.model(input);
    return doc.save();
  }

  async findPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return this.model.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(limit).exec();
  }

  async markAsPublished(id: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        status: 'published',
        publishedAt: new Date(),
      }
    );
  }

  async recordPublishAttempt(id: string, error?: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        $inc: { publishAttempts: 1 },
        lastError: error,
        ...(error && { status: 'failed' }), // Mark as failed after max attempts (handled elsewhere)
      }
    );
  }

  async deletePublished(beforeDate: Date): Promise<number> {
    const result = await this.model.deleteMany({
      status: 'published',
      publishedAt: { $lt: beforeDate },
    });
    return result.deletedCount || 0;
  }

  async countPending(): Promise<number> {
    return this.model.countDocuments({ status: 'pending' });
  }
}
