import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ required: true })
  deviceId: string;

  @Prop({
    required: true,
    type: {
      lat: Number,
      lng: Number,
      name: String,
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
      latency: Number,
      packetLoss: Number,
      signalStrength: Number,
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
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ deviceId: 1, timestamp: -1 });
