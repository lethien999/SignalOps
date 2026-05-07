import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class DeviceMaintenance extends Document {
  @Prop({ required: true, trim: true, unique: true })
  deviceId: string;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ trim: true })
  updatedBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DeviceMaintenanceSchema = SchemaFactory.createForClass(DeviceMaintenance);
DeviceMaintenanceSchema.index({ deviceId: 1 }, { unique: true });
DeviceMaintenanceSchema.index({ enabled: 1, updatedAt: -1 });
