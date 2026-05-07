import mongoose from 'mongoose';

type DeviceMaintenanceRecord = {
  deviceId: string;
  enabled: boolean;
  reason?: string;
  updatedBy?: string;
  updatedAt?: Date;
};

const deviceMaintenanceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, trim: true, unique: true },
    enabled: { type: Boolean, required: true, default: true },
    reason: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true, strict: 'throw', minimize: false },
);

const DeviceMaintenanceModel = mongoose.model<DeviceMaintenanceRecord>(
  'DeviceMaintenance',
  deviceMaintenanceSchema,
);

export class DeviceMaintenanceRepository {
  async findEnabledByDeviceId(deviceId: string): Promise<DeviceMaintenanceRecord | null> {
    return DeviceMaintenanceModel.findOne({ deviceId, enabled: true }).lean().exec();
  }
}
