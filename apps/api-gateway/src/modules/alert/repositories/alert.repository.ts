import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import { Alert } from '../schemas/alert.schema';

export type AlertFindFilters = {
  severity?: string;
  status?: string;
  deviceId?: string;
  from?: Date;
  to?: Date;
  skip: number;
  limit: number;
};

export type AlertHistoryFilters = Pick<AlertFindFilters, 'severity' | 'status' | 'deviceId' | 'from' | 'to'> & {
  days?: number;
};

export type AlertSlaFilters = {
  severity?: string;
  type?: 'latency' | 'packet_loss' | 'signal';
  from?: Date;
  to?: Date;
  days?: number;
};

export type AlertSlaSnapshot = {
  period: {
    from: string;
    to: string;
    days: number;
  };
  filters: {
    severity?: string;
    type?: 'latency' | 'packet_loss' | 'signal';
  };
  totals: {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
  };
  mttrMinutes: number;
  uptimePercent: number;
  alertRatePerHour: number;
  byDay: Array<{
    date: string;
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    mttrMinutes: number;
  }>;
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

  async find(filters: AlertFindFilters): Promise<{ data: Alert[]; total: number; summary: { open: number; acknowledged: number; resolved: number; highOpen: number } }> {
    const query = this.buildQuery(filters);

    const data = await this.alertModel
      .find(query)
      .skip(filters.skip)
      .limit(filters.limit)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.alertModel.countDocuments(query);

    const summary = await this.alertModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          open: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] },
          },
          acknowledged: {
            $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] },
          },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] },
          },
          highOpen: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$status', 'open'] }, { $eq: ['$severity', 'high'] }] }, 1, 0],
            },
          },
        },
      },
    ]);

    return {
      data,
      total,
      summary: summary[0] || { open: 0, acknowledged: 0, resolved: 0, highOpen: 0 },
    };
  }

  async updateStatus(id: string, payload: AlertStatusUpdate): Promise<Alert | null> {
    return this.alertModel.findByIdAndUpdate(id, payload, { new: true }).exec();
  }

  async countActiveAlerts(): Promise<number> {
    return this.alertModel.countDocuments({ status: { $ne: 'resolved' } });
  }

  async alertHistory(filters: AlertHistoryFilters = {}): Promise<{ date: string; open: number; acknowledged: number; resolved: number; total: number }[]> {
    const query = this.buildQuery(filters);
    const pipeline: PipelineStage[] = [];

    if (!filters.from && !filters.to) {
      const since = new Date();
      since.setDate(since.getDate() - (filters.days ?? 7));

      pipeline.push({
        $match: {
          ...query,
          createdAt: { ...(query.createdAt as Record<string, unknown> || {}), $gte: since },
        },
      });
    } else {
      pipeline.push({ $match: query });
    }

    const results = await this.alertModel.aggregate([
      ...pipeline,
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

  async getSlaSnapshot(filters: AlertSlaFilters = {}): Promise<AlertSlaSnapshot> {
    const now = new Date();
    const periodTo = filters.to || now;
    const safeDays = Math.min(Math.max(filters.days ?? 7, 1), 90);
    const periodFrom = filters.from || new Date(periodTo.getTime() - safeDays * 24 * 60 * 60 * 1000);
    const actualDays = Math.max(1, Math.ceil((periodTo.getTime() - periodFrom.getTime()) / (24 * 60 * 60 * 1000)));

    const match: FilterQuery<Alert> = {
      createdAt: {
        $gte: periodFrom,
        $lte: periodTo,
      },
    };

    if (filters.severity) {
      match.severity = filters.severity;
    }

    if (filters.type) {
      match.type = filters.type;
    }

    const [totalsRows, mttrRows, downtimeRows, byDayStatusRows, byDayMttrRows] = await Promise.all([
      this.alertModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          },
        },
      ]),
      this.alertModel.aggregate([
        {
          $match: {
            ...match,
            status: 'resolved',
            resolvedAt: { $exists: true },
          },
        },
        {
          $project: {
            durationMinutes: {
              $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgMinutes: { $avg: '$durationMinutes' },
          },
        },
      ]),
      this.alertModel.aggregate([
        { $match: match },
        {
          $project: {
            durationMs: {
              $max: [
                0,
                {
                  $subtract: [
                    {
                      $cond: [
                        {
                          $and: [
                            { $ifNull: ['$resolvedAt', false] },
                            { $lt: ['$resolvedAt', periodTo] },
                          ],
                        },
                        '$resolvedAt',
                        periodTo,
                      ],
                    },
                    '$createdAt',
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDurationMs: { $sum: '$durationMs' },
          },
        },
      ]),
      this.alertModel.aggregate([
        { $match: match },
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
      ]),
      this.alertModel.aggregate([
        {
          $match: {
            ...match,
            status: 'resolved',
            resolvedAt: { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            },
            avgMinutes: {
              $avg: {
                $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 1000 * 60],
              },
            },
          },
        },
      ]),
    ]);

    const totals = totalsRows[0] || { total: 0, open: 0, acknowledged: 0, resolved: 0 };
    const mttrMinutes = Number((mttrRows[0]?.avgMinutes || 0).toFixed(2));

    const periodHours = Math.max(1 / 60, (periodTo.getTime() - periodFrom.getTime()) / (1000 * 60 * 60));
    const alertRatePerHour = Number(((totals.total || 0) / periodHours).toFixed(2));

    const totalPeriodMs = Math.max(1, periodTo.getTime() - periodFrom.getTime());
    const downtimeMs = Number(downtimeRows[0]?.totalDurationMs || 0);
    const uptimePercent = Number(Math.max(0, 100 - Math.min(100, (downtimeMs / totalPeriodMs) * 100)).toFixed(2));

    const byDayMap = new Map<string, { total: number; open: number; acknowledged: number; resolved: number; mttrMinutes: number }>();

    for (const row of byDayStatusRows) {
      const date = String(row._id.date);
      if (!byDayMap.has(date)) {
        byDayMap.set(date, { total: 0, open: 0, acknowledged: 0, resolved: 0, mttrMinutes: 0 });
      }

      const day = byDayMap.get(date)!;
      const status = row._id.status as 'open' | 'acknowledged' | 'resolved';
      const count = Number(row.count || 0);

      day[status] = count;
      day.total += count;
    }

    for (const row of byDayMttrRows) {
      const date = String(row._id.date);
      if (!byDayMap.has(date)) {
        byDayMap.set(date, { total: 0, open: 0, acknowledged: 0, resolved: 0, mttrMinutes: 0 });
      }

      byDayMap.get(date)!.mttrMinutes = Number((row.avgMinutes || 0).toFixed(2));
    }

    const byDay = Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    return {
      period: {
        from: periodFrom.toISOString(),
        to: periodTo.toISOString(),
        days: actualDays,
      },
      filters: {
        severity: filters.severity,
        type: filters.type,
      },
      totals: {
        total: totals.total || 0,
        open: totals.open || 0,
        acknowledged: totals.acknowledged || 0,
        resolved: totals.resolved || 0,
      },
      mttrMinutes,
      uptimePercent,
      alertRatePerHour,
      byDay,
    };
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

  private buildQuery(filters: Pick<AlertFindFilters, 'severity' | 'status' | 'deviceId' | 'from' | 'to'>): FilterQuery<Alert> {
    const query: FilterQuery<Alert> = {};

    if (filters.severity) {
      query.severity = filters.severity;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.deviceId) {
      query.deviceId = filters.deviceId;
    }

    if (filters.from || filters.to) {
      query.createdAt = {} as FilterQuery<Alert>['createdAt'];

      if (filters.from) {
        (query.createdAt as Record<string, Date>)['$gte'] = filters.from;
      }

      if (filters.to) {
        (query.createdAt as Record<string, Date>)['$lte'] = filters.to;
      }
    }

    return query;
  }
}