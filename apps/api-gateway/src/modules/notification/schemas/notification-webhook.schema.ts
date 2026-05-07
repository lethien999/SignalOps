import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationChannel = 'slack' | 'telegram';
export type NotificationSeverity = 'low' | 'warning' | 'medium' | 'high' | 'critical';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class NotificationWebhook extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ['slack', 'telegram'] })
  channel: NotificationChannel;

  @Prop({ required: true, trim: true })
  webhookUrl: string;

  @Prop({ type: [String], default: ['high', 'critical'] })
  severities: NotificationSeverity[];

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ default: 3, min: 1, max: 10 })
  retryMax: number;

  @Prop({ default: 1000, min: 100, max: 30000 })
  retryBackoffMs: number;

  @Prop({ enum: ['never', 'success', 'failed'], default: 'never' })
  lastStatus: 'never' | 'success' | 'failed';

  @Prop()
  lastAttemptAt?: Date;

  @Prop()
  lastSuccessAt?: Date;

  @Prop()
  lastResponseCode?: number;

  @Prop({ trim: true })
  lastError?: string;

  @Prop({ trim: true })
  updatedBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationWebhookSchema = SchemaFactory.createForClass(NotificationWebhook);
NotificationWebhookSchema.index({ enabled: 1, channel: 1, updatedAt: -1 });
NotificationWebhookSchema.index({ name: 1 }, { unique: true });
