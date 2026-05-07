import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ThresholdProfile } from '../schemas/threshold-profile.schema';
import { UpsertThresholdProfileDto } from '../dto/upsert-threshold-profile.dto';

@Injectable()
export class ThresholdProfileRepository {
  constructor(@InjectModel(ThresholdProfile.name) private readonly thresholdProfileModel: Model<ThresholdProfile>) {}

  async findAll(): Promise<ThresholdProfile[]> {
    return this.thresholdProfileModel.find().sort({ scopeType: 1, scopeId: 1 }).lean().exec() as unknown as ThresholdProfile[];
  }

  async findEffective(deviceId?: string): Promise<ThresholdProfile[]> {
    const profiles: ThresholdProfile[] = [];

    if (deviceId) {
      const deviceProfile = await this.thresholdProfileModel.findOne({ scopeType: 'device', scopeId: deviceId }).lean().exec();
      if (deviceProfile) {
        profiles.push(deviceProfile as unknown as ThresholdProfile);
      }
    }

    const globalProfile = await this.thresholdProfileModel.findOne({ scopeType: 'global', scopeId: 'global' }).lean().exec();
    if (globalProfile) {
      profiles.push(globalProfile as unknown as ThresholdProfile);
    }

    return profiles;
  }

  async upsert(input: UpsertThresholdProfileDto): Promise<ThresholdProfile> {
    const update = {
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      ...(input.latencyWarningMs !== undefined ? { latencyWarningMs: input.latencyWarningMs } : {}),
      ...(input.latencyCriticalMs !== undefined ? { latencyCriticalMs: input.latencyCriticalMs } : {}),
      ...(input.packetLossWarningPercent !== undefined ? { packetLossWarningPercent: input.packetLossWarningPercent } : {}),
      ...(input.packetLossCriticalPercent !== undefined ? { packetLossCriticalPercent: input.packetLossCriticalPercent } : {}),
      ...(input.signalWarningDbm !== undefined ? { signalWarningDbm: input.signalWarningDbm } : {}),
      ...(input.signalCriticalDbm !== undefined ? { signalCriticalDbm: input.signalCriticalDbm } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
    };

    return this.thresholdProfileModel
      .findOneAndUpdate(
        { scopeType: input.scopeType, scopeId: input.scopeId },
        { $set: update, $setOnInsert: { scopeType: input.scopeType, scopeId: input.scopeId } },
        { upsert: true, new: true, runValidators: true },
      )
      .exec() as Promise<ThresholdProfile>;
  }

  async delete(scopeType: 'global' | 'device', scopeId: string): Promise<void> {
    await this.thresholdProfileModel.deleteOne({ scopeType, scopeId }).exec();
  }
}
