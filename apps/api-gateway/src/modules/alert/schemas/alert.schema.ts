import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class Alert extends Document {
  @Prop({ required: true, unique: true, trim: true })
  alertId: string;

  @Prop({ required: true, trim: true })
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

  @Prop({ required: true, trim: true })
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

  createdAt?: Date;

  updatedAt?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
AlertSchema.index({ status: 1, severity: -1, createdAt: -1 });
