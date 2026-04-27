import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Alert } from '../schemas/alert.schema';

export type AlertFindFilters = {
  severity?: string;
  status?: string;
  skip: number;
  limit: number;
};

export type AlertStatusUpdate = {
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
};

@Injectable()
export class AlertRepository {
  constructor(@InjectModel(Alert.name) private readonly alertModel: Model<Alert>) {}

  async save(payload: Record<string, unknown>): Promise<Alert> {
    const alert = new this.alertModel(payload);
    return alert.save();
  }

  async findById(id: string): Promise<Alert | null> {
    return this.alertModel.findById(id).exec();
  }

  async find(filters: AlertFindFilters): Promise<{ data: Alert[]; total: number }> {
    const query = this.buildQuery(filters);

    const data = await this.alertModel
      .find(query)
      .skip(filters.skip)
      .limit(filters.limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.alertModel.countDocuments(query);

    return { data, total };
  }

  async updateStatus(id: string, payload: AlertStatusUpdate): Promise<Alert | null> {
    return this.alertModel.findByIdAndUpdate(id, payload, { new: true }).exec();
  }

  async countActiveAlerts(): Promise<number> {
    return this.alertModel.countDocuments({ status: { $ne: 'resolved' } });
  }

  private buildQuery(filters: AlertFindFilters): FilterQuery<Alert> {
    const query: FilterQuery<Alert> = {};

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return query;
  }
}