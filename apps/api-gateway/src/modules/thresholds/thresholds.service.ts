import { Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '../../common/logger';
import { ThresholdProfileRepository } from './repositories/threshold-profile.repository';
import { UpsertThresholdProfileDto } from './dto/upsert-threshold-profile.dto';

@Injectable()
export class ThresholdsService {
  constructor(private readonly thresholdProfileRepository: ThresholdProfileRepository) {}

  async listProfiles() {
    return this.thresholdProfileRepository.findAll();
  }

  async getEffectiveProfile(deviceId?: string) {
    const profiles = await this.thresholdProfileRepository.findEffective(deviceId);
    return profiles;
  }

  async upsertProfile(input: UpsertThresholdProfileDto) {
    const saved = await this.thresholdProfileRepository.upsert(input);
    Logger.info('Cập nhật ngưỡng động', {
      scopeType: saved.scopeType,
      scopeId: saved.scopeId,
      updatedBy: saved.updatedBy,
    });
    return saved;
  }

  async rollbackProfile(scopeType: 'global' | 'device', scopeId: string) {
    if (scopeType === 'global' && scopeId !== 'global') {
      throw new NotFoundException('Phạm vi global không hợp lệ');
    }

    await this.thresholdProfileRepository.delete(scopeType, scopeId);
    Logger.info('Rollback ngưỡng động', { scopeType, scopeId });
    return { success: true };
  }
}
