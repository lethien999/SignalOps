import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Alert extends Document {
  @Prop({ required: true, unique: true })
  alertId: string;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true, enum: ['latency', 'packet_loss', 'signal'] })
  type: string;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high'],
  })
  severity: string;

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

  @Prop({ required: true })
  message: string;

  @Prop({
    default: 'open',
    enum: ['open', 'acknowledged', 'resolved'],
  })
  status: string;

  @Prop()
  acknowledgedBy?: string;

  @Prop()
  acknowledgedAt?: Date;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  eventId?: string;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
AlertSchema.index({ status: 1, severity: -1, createdAt: -1 });
