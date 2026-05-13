import os from 'node:os';
import { Connection } from 'mongoose';
import { register } from 'prom-client';
import { Logger } from '../../common/logger';
import { BusinessMetrics } from './business-metrics';

export type CostPeriod = 'day' | 'week' | 'month';
export type ScaleRecommendation = 'scale_up' | 'stable' | 'scale_down';

export type CostBreakdownItem = {
  resource: 'cpu' | 'memory' | 'storage';
  amountUsd: number;
  note: string;
};

export type CostMetricsSnapshot = {
  period: CostPeriod;
  hours: number;
  cpuPercent: number;
  memoryPercent: number;
  memoryBytes: number;
  storageBytes: number;
  queueName: string;
  queueDepth: number;
  hourlyCostUsd: number;
  periodCostUsd: number;
  breakdown: CostBreakdownItem[];
  warning?: string;
  timestamp: string;
};

export type ScaleStatusSnapshot = {
  recommendation: ScaleRecommendation;
  score: number;
  reasons: string[];
  cpuPercent: number;
  memoryPercent: number;
  queueDepth: number;
  queueName: string;
  thresholds: {
    scaleUpCpuPercent: number;
    scaleDownCpuPercent: number;
    scaleUpMemoryPercent: number;
    scaleDownMemoryPercent: number;
    scaleUpQueueDepth: number;
    scaleDownQueueDepth: number;
  };
  timestamp: string;
};

const BYTES_PER_GB = 1024 * 1024 * 1024;

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPeriodHours(period: CostPeriod): number {
  if (period === 'week') {
    return 24 * 7;
  }

  if (period === 'month') {
    return 24 * 30;
  }

  return 24;
}

async function getQueueSnapshot(): Promise<{ queueName: string; queueDepth: number }> {
  const metric = register.getSingleMetric('signalops_queue_depth') as
    | {
        get?: () => Promise<{
          values?: Array<{ labels?: Record<string, unknown>; value?: number }>;
        }>;
      }
    | undefined;

  if (!metric?.get) {
    return { queueName: 'default', queueDepth: 0 };
  }

  const current = await metric.get();
  const values = Array.isArray(current?.values) ? current.values : [];

  let queueName = 'default';
  let queueDepth = 0;

  for (const value of values) {
    const depth = typeof value.value === 'number' ? value.value : Number(value.value ?? 0);
    if (depth >= queueDepth) {
      queueDepth = depth;
      queueName =
        typeof value.labels?.queue_name === 'string' ? value.labels.queue_name : queueName;
    }
  }

  return { queueName, queueDepth };
}

function getCpuPercent(): number {
  const cpuUsage = process.cpuUsage();
  const totalMicroseconds = cpuUsage.user + cpuUsage.system;
  const uptimeSeconds = Math.max(process.uptime(), 1);
  const cpuCount = Math.max(os.cpus().length, 1);
  const percent = (totalMicroseconds / 1_000_000 / uptimeSeconds / cpuCount) * 100;
  return Math.max(0, Math.min(100, percent));
}

function getMemoryPercent(memoryBytes: number): number {
  const totalMemory = Math.max(os.totalmem(), 1);
  return Math.max(0, Math.min(100, (memoryBytes / totalMemory) * 100));
}

function getCostFactors() {
  return {
    cpuHourlyUsd: readNumberEnv('COST_CPU_HOURLY_USD', 0.08),
    memoryGbHourlyUsd: readNumberEnv('COST_MEMORY_GB_HOURLY_USD', 0.01),
    storageGbMonthlyUsd: readNumberEnv('COST_STORAGE_GB_MONTHLY_USD', 0.02),
    alertThresholdUsdPerHour: readNumberEnv('COST_ALERT_THRESHOLD_USD_PER_HOUR', 1),
  };
}

function getScaleThresholds() {
  return {
    scaleUpCpuPercent: readNumberEnv('SCALE_UP_CPU_PERCENT', 70),
    scaleDownCpuPercent: readNumberEnv('SCALE_DOWN_CPU_PERCENT', 30),
    scaleUpMemoryPercent: readNumberEnv('SCALE_UP_MEMORY_PERCENT', 80),
    scaleDownMemoryPercent: readNumberEnv('SCALE_DOWN_MEMORY_PERCENT', 50),
    scaleUpQueueDepth: readNumberEnv('SCALE_UP_QUEUE_DEPTH', 10000),
    scaleDownQueueDepth: readNumberEnv('SCALE_DOWN_QUEUE_DEPTH', 1000),
  };
}

async function getMongoStorageBytes(connection: Connection): Promise<number> {
  const database = connection.db;

  if (!database) {
    return 0;
  }

  try {
    const stats = await database.stats();
    return Number(stats.storageSize || stats.dataSize || 0);
  } catch {
    return 0;
  }
}

async function collectInfrastructureSnapshot(connection: Connection) {
  const [queueSnapshot, storageBytes] = await Promise.all([
    getQueueSnapshot(),
    getMongoStorageBytes(connection),
  ]);

  const memoryBytes = process.memoryUsage().rss;
  const cpuPercent = getCpuPercent();
  const memoryPercent = getMemoryPercent(memoryBytes);

  return {
    queueName: queueSnapshot.queueName,
    queueDepth: queueSnapshot.queueDepth,
    storageBytes,
    memoryBytes,
    cpuPercent,
    memoryPercent,
  };
}

export class InfrastructureObservability {
  static async getCostSnapshot(
    connection: Connection,
    period: CostPeriod = 'day'
  ): Promise<CostMetricsSnapshot> {
    const hours = getPeriodHours(period);
    const factors = getCostFactors();
    const snapshot = await collectInfrastructureSnapshot(connection);

    const memoryGb = snapshot.memoryBytes / BYTES_PER_GB;
    const storageGb = snapshot.storageBytes / BYTES_PER_GB;
    const hourlyCostUsd =
      (snapshot.cpuPercent / 100) * factors.cpuHourlyUsd +
      memoryGb * factors.memoryGbHourlyUsd +
      storageGb * (factors.storageGbMonthlyUsd / (24 * 30));
    const periodCostUsd = hourlyCostUsd * hours;
    const breakdown: CostBreakdownItem[] = [
      {
        resource: 'cpu',
        amountUsd: (snapshot.cpuPercent / 100) * factors.cpuHourlyUsd * hours,
        note: `CPU ${snapshot.cpuPercent.toFixed(1)}%`,
      },
      {
        resource: 'memory',
        amountUsd: memoryGb * factors.memoryGbHourlyUsd * hours,
        note: `Memory ${memoryGb.toFixed(2)} GiB`,
      },
      {
        resource: 'storage',
        amountUsd: storageGb * factors.storageGbMonthlyUsd * (hours / (24 * 30)),
        note: `Storage ${storageGb.toFixed(2)} GiB`,
      },
    ];

    BusinessMetrics.recordInfrastructureSnapshot({
      service: 'api-gateway',
      cpuPercent: snapshot.cpuPercent,
      memoryBytes: snapshot.memoryBytes,
      storageBytes: snapshot.storageBytes,
      queueName: snapshot.queueName,
      queueDepth: snapshot.queueDepth,
      costPerHourUsd: hourlyCostUsd,
      periodUsd: periodCostUsd,
      period,
    });

    if (hourlyCostUsd >= factors.alertThresholdUsdPerHour) {
      Logger.warn('Infrastructure cost threshold exceeded', {
        period,
        hourlyCostUsd: Number(hourlyCostUsd.toFixed(4)),
        thresholdUsdPerHour: factors.alertThresholdUsdPerHour,
      });
    }

    return {
      period,
      hours,
      cpuPercent: snapshot.cpuPercent,
      memoryPercent: snapshot.memoryPercent,
      memoryBytes: snapshot.memoryBytes,
      storageBytes: snapshot.storageBytes,
      queueName: snapshot.queueName,
      queueDepth: snapshot.queueDepth,
      hourlyCostUsd,
      periodCostUsd,
      breakdown,
      warning:
        hourlyCostUsd >= factors.alertThresholdUsdPerHour
          ? `Estimated hourly cost ${hourlyCostUsd.toFixed(2)} USD exceeds threshold`
          : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  static async getScaleStatus(connection: Connection): Promise<ScaleStatusSnapshot> {
    const thresholds = getScaleThresholds();
    const snapshot = await collectInfrastructureSnapshot(connection);
    const reasons: string[] = [];

    if (snapshot.cpuPercent >= thresholds.scaleUpCpuPercent) {
      reasons.push(`CPU ${snapshot.cpuPercent.toFixed(1)}% >= ${thresholds.scaleUpCpuPercent}%`);
    }

    if (snapshot.memoryPercent >= thresholds.scaleUpMemoryPercent) {
      reasons.push(
        `Memory ${snapshot.memoryPercent.toFixed(1)}% >= ${thresholds.scaleUpMemoryPercent}%`
      );
    }

    if (snapshot.queueDepth >= thresholds.scaleUpQueueDepth) {
      reasons.push(`Queue depth ${snapshot.queueDepth} >= ${thresholds.scaleUpQueueDepth}`);
    }

    let recommendation: ScaleRecommendation = 'stable';
    if (
      snapshot.cpuPercent >= thresholds.scaleUpCpuPercent ||
      snapshot.memoryPercent >= thresholds.scaleUpMemoryPercent ||
      snapshot.queueDepth >= thresholds.scaleUpQueueDepth
    ) {
      recommendation = 'scale_up';
    } else if (
      snapshot.cpuPercent <= thresholds.scaleDownCpuPercent &&
      snapshot.memoryPercent <= thresholds.scaleDownMemoryPercent &&
      snapshot.queueDepth <= thresholds.scaleDownQueueDepth
    ) {
      recommendation = 'scale_down';
      reasons.push(
        `CPU ${snapshot.cpuPercent.toFixed(1)}%, memory ${snapshot.memoryPercent.toFixed(1)}%, queue ${snapshot.queueDepth} are below scale-down thresholds`
      );
    } else {
      reasons.push('System is within normal operating range');
    }

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          snapshot.cpuPercent * 0.45 +
            snapshot.memoryPercent * 0.35 +
            Math.min((snapshot.queueDepth / Math.max(thresholds.scaleUpQueueDepth, 1)) * 100, 100) *
              0.2
        )
      )
    );
    const recommendationValue: -1 | 0 | 1 =
      recommendation === 'scale_up' ? 1 : recommendation === 'scale_down' ? -1 : 0;

    BusinessMetrics.recordScaleRecommendation('api-gateway', recommendationValue);

    if (recommendation !== 'stable') {
      Logger.warn('Auto-scaling recommendation updated', {
        recommendation,
        score,
        cpuPercent: Number(snapshot.cpuPercent.toFixed(2)),
        memoryPercent: Number(snapshot.memoryPercent.toFixed(2)),
        queueDepth: snapshot.queueDepth,
      });
    }

    return {
      recommendation,
      score,
      reasons,
      cpuPercent: snapshot.cpuPercent,
      memoryPercent: snapshot.memoryPercent,
      queueDepth: snapshot.queueDepth,
      queueName: snapshot.queueName,
      thresholds,
      timestamp: new Date().toISOString(),
    };
  }
}
