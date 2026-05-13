import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeviceMaintenance } from '../schemas/device-maintenance.schema';

export type DeviceMaintenanceUpdateInput = {
  enabled: boolean;
  reason?: string;
  updatedBy?: string;
};

@Injectable()
export class DeviceMaintenanceRepository {
  constructor(
    @InjectModel(DeviceMaintenance.name)
    private readonly deviceMaintenanceModel: Model<DeviceMaintenance>
  ) {}

  async setByDeviceId(
    deviceId: string,
    input: DeviceMaintenanceUpdateInput
  ): Promise<DeviceMaintenance> {
    const updatePayload = {
      enabled: input.enabled,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
    };

    return this.deviceMaintenanceModel
      .findOneAndUpdate(
        { deviceId },
        {
          $set: updatePayload,
          $setOnInsert: { deviceId },
        },
        { upsert: true, new: true, runValidators: true }
      )
      .exec() as Promise<DeviceMaintenance>;
  }

  async findEnabledByDeviceIds(deviceIds: string[]): Promise<DeviceMaintenance[]> {
    if (deviceIds.length === 0) {
      return [];
    }

    return this.deviceMaintenanceModel
      .find({ deviceId: { $in: deviceIds }, enabled: true })
      .lean()
      .exec() as unknown as DeviceMaintenance[];
  }

  async findEnabled(skip = 0, limit = 200): Promise<DeviceMaintenance[]> {
    return this.deviceMaintenanceModel
      .find({ enabled: true })
      .sort({ updatedAt: -1 })
      .skip(Math.max(skip, 0))
      .limit(Math.max(limit, 1))
      .lean()
      .exec() as unknown as DeviceMaintenance[];
  }
}
