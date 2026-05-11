import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  apiKey: string;

  @Prop({ type: Object, required: true })
  quota: {
    eventsPerMonth: number;
    alertsPerMonth: number;
  };

  @Prop({
    type: Object,
    default: () => ({
      events: 0,
      alerts: 0,
      month: new Date().toISOString().slice(0, 7), // YYYY-MM
    }),
  })
  usage: {
    events: number;
    alerts: number;
    month: string;
  };

  @Prop({ enum: ['active', 'suspended', 'deleted'], default: 'active' })
  status: string;

  @Prop({ type: String, default: null })
  description?: string;

  @Prop({ type: [Types.ObjectId], default: [] })
  adminUserIds: Types.ObjectId[]; // Users who can manage this tenant

  @Prop({ type: Boolean, default: true })
  aiEnabled: boolean; // Enable/disable AI anomaly scoring for this tenant (M13)

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Date, default: () => new Date() })
  updatedAt: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Indexes for efficient lookup
TenantSchema.index({ apiKey: 1 });
TenantSchema.index({ status: 1 });
TenantSchema.index({ createdAt: -1 });
