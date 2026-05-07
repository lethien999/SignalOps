import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThresholdScopeType = 'global' | 'device';

@Schema({ timestamps: true, strict: 'throw', minimize: false })
export class ThresholdProfile extends Document {
  @Prop({ required: true, enum: ['global', 'device'] })
  scopeType: ThresholdScopeType;

  @Prop({ required: true, trim: true })
  scopeId: string;

  @Prop({ required: true, default: 150, min: 0 })
  latencyWarningMs: number;

  @Prop({ required: true, default: 300, min: 0 })
  latencyCriticalMs: number;

  @Prop({ required: true, default: 3, min: 0, max: 100 })
  packetLossWarningPercent: number;

  @Prop({ required: true, default: 8, min: 0, max: 100 })
  packetLossCriticalPercent: number;

  @Prop({ required: true, default: -80, max: 0 })
  signalWarningDbm: number;

  @Prop({ required: true, default: -100, max: 0 })
  signalCriticalDbm: number;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ trim: true })
  updatedBy?: string;

  @Prop({ trim: true })
  note?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ThresholdProfileSchema = SchemaFactory.createForClass(ThresholdProfile);
ThresholdProfileSchema.index({ scopeType: 1, scopeId: 1 }, { unique: true });
ThresholdProfileSchema.index({ scopeType: 1, updatedAt: -1 });
