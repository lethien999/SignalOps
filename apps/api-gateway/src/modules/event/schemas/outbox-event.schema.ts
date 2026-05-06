import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class OutboxEvent extends Document {
  @Prop({ required: true, enum: ['event', 'alert'] })
  eventType: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, any>;

  @Prop({ default: 'pending', enum: ['pending', 'published', 'failed'] })
  status: 'pending' | 'published' | 'failed';

  @Prop({ default: 0 })
  publishAttempts: number;

  @Prop()
  lastError?: string;

  @Prop()
  publishedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, createdAt: 1 });
OutboxEventSchema.index({ publishedAt: 1 }, { sparse: true });
