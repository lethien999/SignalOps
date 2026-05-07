import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationWebhook } from '../schemas/notification-webhook.schema';

export type NotificationWebhookCreateInput = {
  name: string;
  channel: 'slack' | 'telegram';
  webhookUrl: string;
  severities: Array<'low' | 'warning' | 'medium' | 'high' | 'critical'>;
  enabled?: boolean;
  retryMax?: number;
  retryBackoffMs?: number;
  updatedBy?: string;
};

export type NotificationWebhookUpdateInput = Partial<NotificationWebhookCreateInput>;

@Injectable()
export class NotificationWebhookRepository {
  constructor(
    @InjectModel(NotificationWebhook.name)
    private readonly notificationWebhookModel: Model<NotificationWebhook>,
  ) {}

  async findAll(): Promise<NotificationWebhook[]> {
    return this.notificationWebhookModel
      .find()
      .sort({ updatedAt: -1 })
      .lean()
      .exec() as unknown as NotificationWebhook[];
  }

  async create(input: NotificationWebhookCreateInput): Promise<NotificationWebhook> {
    const row = new this.notificationWebhookModel({
      name: input.name,
      channel: input.channel,
      webhookUrl: input.webhookUrl,
      severities: input.severities,
      enabled: input.enabled ?? true,
      retryMax: input.retryMax ?? 3,
      retryBackoffMs: input.retryBackoffMs ?? 1000,
      updatedBy: input.updatedBy,
    });
    return row.save();
  }

  async updateById(id: string, input: NotificationWebhookUpdateInput): Promise<NotificationWebhook | null> {
    return this.notificationWebhookModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.channel !== undefined ? { channel: input.channel } : {}),
            ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
            ...(input.severities !== undefined ? { severities: input.severities } : {}),
            ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
            ...(input.retryMax !== undefined ? { retryMax: input.retryMax } : {}),
            ...(input.retryBackoffMs !== undefined ? { retryBackoffMs: input.retryBackoffMs } : {}),
            ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
  }
}
