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
  resolvedBy?: string;
  resolutionNote?: string;
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

  /**
   * E3: Aggregate alert counts by day for the last N days
   */
  async alertHistory(days: number = 7): Promise<{ date: string; open: number; acknowledged: number; resolved: number; total: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.alertModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Transform to day-level summary
    const dayMap = new Map<string, { open: number; acknowledged: number; resolved: number; total: number }>();
    for (const row of results) {
      const date = row._id.date;
      if (!dayMap.has(date)) {
        dayMap.set(date, { open: 0, acknowledged: 0, resolved: 0, total: 0 });
      }
      const entry = dayMap.get(date)!;
      entry[row._id.status as 'open' | 'acknowledged' | 'resolved'] = row.count;
      entry.total += row.count;
    }

    return Array.from(dayMap.entries()).map(([date, counts]) => ({ date, ...counts }));
  }

  buildAlertHistoryCsv(rows: { date: string; open: number; acknowledged: number; resolved: number; total: number }[]): string {
    const header = ['date', 'open', 'acknowledged', 'resolved', 'total'];
    const escapeCsvValue = (value: string | number): string => {
      const text = String(value);
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    };

    const lines = [header.join(',')];

    for (const row of rows) {
      lines.push([
        escapeCsvValue(row.date),
        escapeCsvValue(row.open),
        escapeCsvValue(row.acknowledged),
        escapeCsvValue(row.resolved),
        escapeCsvValue(row.total),
      ].join(','));
    }

    return lines.join('\n');
  }
}