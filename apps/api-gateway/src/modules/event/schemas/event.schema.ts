import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class Event extends Document {
  @Prop({ required: true, trim: true })
  deviceId: string;

  @Prop({
    required: true,
    type: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      name: { type: String, trim: true },
    },
  })
  location: {
    lat: number;
    lng: number;
    name?: string;
  };

  @Prop({
    required: true,
    type: {
      latency: { type: Number, required: true, min: 0 },
      packetLoss: { type: Number, required: true, min: 0, max: 100 },
      signalStrength: { type: Number, required: true, min: -120, max: 0 },
    },
  })
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  alertId?: string;

  @Prop()
  archivedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ deviceId: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1 });
// TTL index: automatically delete events after 90 days
// 90 days = 7776000 seconds
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
