import mongoose from 'mongoose';

export type ThresholdProfileRecord = {
  scopeType: 'global' | 'device';
  scopeId: string;
  latencyWarningMs: number;
  latencyCriticalMs: number;
  packetLossWarningPercent: number;
  packetLossCriticalPercent: number;
  signalWarningDbm: number;
  signalCriticalDbm: number;
  enabled: boolean;
  updatedBy?: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const thresholdProfileSchema = new mongoose.Schema(
  {
    scopeType: { type: String, required: true, enum: ['global', 'device'] },
    scopeId: { type: String, required: true, trim: true },
    latencyWarningMs: { type: Number, required: true, default: 150, min: 0 },
    latencyCriticalMs: { type: Number, required: true, default: 300, min: 0 },
    packetLossWarningPercent: { type: Number, required: true, default: 3, min: 0, max: 100 },
    packetLossCriticalPercent: { type: Number, required: true, default: 8, min: 0, max: 100 },
    signalWarningDbm: { type: Number, required: true, default: -80, max: 0 },
    signalCriticalDbm: { type: Number, required: true, default: -100, max: 0 },
    enabled: { type: Boolean, required: true, default: true },
    updatedBy: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { timestamps: true, strict: 'throw', minimize: false },
);

thresholdProfileSchema.index({ scopeType: 1, scopeId: 1 }, { unique: true });

const ThresholdProfileModel = mongoose.model<ThresholdProfileRecord>('ThresholdProfile', thresholdProfileSchema);

export class ThresholdProfileRepository {
  async findEffective(deviceId?: string): Promise<ThresholdProfileRecord | null> {
    if (deviceId) {
      const deviceProfile = await ThresholdProfileModel.findOne({ scopeType: 'device', scopeId: deviceId }).lean().exec();
      if (deviceProfile) {
        return deviceProfile;
      }
    }

    return ThresholdProfileModel.findOne({ scopeType: 'global', scopeId: 'global' }).lean().exec();
  }
}
