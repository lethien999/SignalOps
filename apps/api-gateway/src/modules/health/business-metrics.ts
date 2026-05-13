import { Counter, Histogram, Gauge, register } from 'prom-client';

/**
 * Business Metrics for SignalOps
 * Tracks key business indicators
 */

export class BusinessMetrics {
  private static readonly eventsIngested = new Counter({
    name: 'signalops_events_ingested_total',
    help: 'Total number of events ingested',
    labelNames: ['source'],
    registers: [register],
  });

  private static readonly alertsCreated = new Counter({
    name: 'signalops_alerts_created_total',
    help: 'Total number of alerts created',
    labelNames: ['type', 'severity'],
    registers: [register],
  });

  private static readonly alertsResolved = new Counter({
    name: 'signalops_alerts_resolved_total',
    help: 'Total number of alerts resolved',
    labelNames: ['type', 'resolution_type'],
    registers: [register],
  });

  private static readonly queueDepth = new Gauge({
    name: 'signalops_queue_depth',
    help: 'Current depth of the event processing queue',
    labelNames: ['queue_name'],
    registers: [register],
  });

  private static readonly jobProcessingSeconds = new Histogram({
    name: 'signalops_job_processing_seconds',
    help: 'Time taken to process a job',
    labelNames: ['job_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
  });

  private static readonly aggregationDuration = new Histogram({
    name: 'signalops_aggregation_duration_seconds',
    help: 'Duration of MongoDB aggregation pipelines',
    labelNames: ['pipeline'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    registers: [register],
  });

  private static readonly eventLatency = new Histogram({
    name: 'signalops_event_latency_ms',
    help: 'Event latency from metrics (milliseconds)',
    labelNames: ['device_type'],
    buckets: [50, 100, 200, 300, 500, 1000],
    registers: [register],
  });

  private static readonly tenantUsage = new Gauge({
    name: 'signalops_tenant_usage',
    help: 'Current tenant quota usage',
    labelNames: ['tenant_name', 'resource_type'],
    registers: [register],
  });

  private static readonly tenantQuotaRemaining = new Gauge({
    name: 'signalops_tenant_quota_remaining',
    help: 'Remaining quota for tenant',
    labelNames: ['tenant_name', 'resource_type'],
    registers: [register],
  });

  private static readonly tenantQuotaExceeded = new Counter({
    name: 'signalops_tenant_quota_exceeded_total',
    help: 'Total quota exceeded events',
    labelNames: ['tenant_name', 'resource_type'],
    registers: [register],
  });

  private static readonly infrastructureCpuUsage = new Gauge({
    name: 'signalops_infrastructure_cpu_usage_percent',
    help: 'Current infrastructure CPU usage percentage',
    labelNames: ['service'],
    registers: [register],
  });

  private static readonly infrastructureMemoryUsage = new Gauge({
    name: 'signalops_infrastructure_memory_usage_bytes',
    help: 'Current infrastructure memory usage in bytes',
    labelNames: ['service'],
    registers: [register],
  });

  private static readonly infrastructureStorageUsage = new Gauge({
    name: 'signalops_infrastructure_storage_usage_bytes',
    help: 'Current MongoDB storage usage in bytes',
    labelNames: ['database'],
    registers: [register],
  });

  private static readonly infrastructureCostEstimate = new Gauge({
    name: 'signalops_infrastructure_cost_estimate_usd',
    help: 'Estimated infrastructure cost in USD',
    labelNames: ['period'],
    registers: [register],
  });

  private static readonly scaleRecommendation = new Gauge({
    name: 'signalops_scale_recommendation',
    help: 'Auto-scaling recommendation (-1 scale down, 0 stable, 1 scale up)',
    labelNames: ['service'],
    registers: [register],
  });

  static recordEventIngested(source: string = 'api') {
    this.eventsIngested.inc({ source });
  }

  static recordAlertCreated(type: string, severity: string) {
    this.alertsCreated.inc({ type, severity });
  }

  static recordAlertResolved(type: string, resolutionType: 'auto' | 'manual') {
    this.alertsResolved.inc({ type, resolution_type: resolutionType });
  }

  static recordQueueDepth(queueName: string, depth: number) {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }

  static recordJobProcessing(
    jobType: string,
    durationSeconds: number,
    status: 'success' | 'failed'
  ) {
    this.jobProcessingSeconds.observe({ job_type: jobType, status }, durationSeconds);
  }

  static recordEventMetric(metricType: 'latency', value: number, deviceType: string = 'unknown') {
    if (metricType === 'latency') {
      this.eventLatency.observe({ device_type: deviceType }, value);
    }
  }

  static recordAggregationDuration(pipeline: string, seconds: number) {
    this.aggregationDuration.observe({ pipeline }, seconds);
  }

  static recordTenantUsage(
    tenantName: string,
    resourceType: 'events' | 'alerts',
    current: number,
    quota: number
  ) {
    this.tenantUsage.set({ tenant_name: tenantName, resource_type: resourceType }, current);
    this.tenantQuotaRemaining.set(
      { tenant_name: tenantName, resource_type: resourceType },
      Math.max(0, quota - current)
    );
  }

  static recordTenantQuotaExceeded(tenantName: string, resourceType: 'events' | 'alerts') {
    this.tenantQuotaExceeded.inc({ tenant_name: tenantName, resource_type: resourceType });
  }

  static recordInfrastructureSnapshot(input: {
    service: string;
    cpuPercent: number;
    memoryBytes: number;
    storageBytes: number;
    queueName: string;
    queueDepth: number;
    costPerHourUsd: number;
    periodUsd: number;
    period: 'day' | 'week' | 'month';
  }) {
    this.infrastructureCpuUsage.set({ service: input.service }, input.cpuPercent);
    this.infrastructureMemoryUsage.set({ service: input.service }, input.memoryBytes);
    this.infrastructureStorageUsage.set({ database: input.service }, input.storageBytes);
    this.queueDepth.set({ queue_name: input.queueName }, input.queueDepth);
    this.infrastructureCostEstimate.set({ period: 'hour' }, input.costPerHourUsd);
    this.infrastructureCostEstimate.set({ period: input.period }, input.periodUsd);
  }

  static recordScaleRecommendation(service: string, recommendation: -1 | 0 | 1) {
    this.scaleRecommendation.set({ service }, recommendation);
  }
}
