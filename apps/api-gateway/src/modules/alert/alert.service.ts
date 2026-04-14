import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert } from './schemas/alert.schema';
import { Logger } from '../../common/logger';

@Injectable()
export class AlertService {
  constructor(
    @InjectModel(Alert.name) private alertModel: Model<Alert>,
  ) {}

  async createAlert(alertData: any): Promise<Alert> {
    try {
      const alert = new this.alertModel(alertData);
      const savedAlert = await alert.save();
      Logger.info(`Alert created: ${savedAlert._id}`);
      return savedAlert;
    } catch (error) {
      Logger.error('Failed to create alert', error);
      throw error;
    }
  }

  async listAlerts(filters: any): Promise<any> {
    try {
      const query: any = {};

      if (filters.severity) {
        query.severity = filters.severity;
      }
      if (filters.status) {
        query.status = filters.status;
      }

      const alerts = await this.alertModel
        .find(query)
        .skip(filters.skip)
        .limit(filters.limit)
        .sort({ createdAt: -1 })
        .exec();

      const total = await this.alertModel.countDocuments(query);

      return {
        data: alerts,
        pagination: {
          skip: filters.skip,
          limit: filters.limit,
          total,
        },
      };
    } catch (error) {
      Logger.error('Failed to list alerts', error);
      throw error;
    }
  }

  async getAlert(id: string): Promise<Alert> {
    try {
      const alert = await this.alertModel.findById(id).exec();
      return alert;
    } catch (error) {
      Logger.error(`Failed to get alert ${id}`, error);
      throw error;
    }
  }

  async updateAlert(id: string, updateData: any): Promise<Alert> {
    try {
      const alert = await this.alertModel.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      Logger.info(`Alert updated: ${id}`);
      return alert;
    } catch (error) {
      Logger.error(`Failed to update alert ${id}`, error);
      throw error;
    }
  }
}
