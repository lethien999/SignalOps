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

  private static readonly eventLatency = new Histogram({
    name: 'signalops_event_latency_ms',
    help: 'Event latency from metrics (milliseconds)',
    labelNames: ['device_type'],
    buckets: [50, 100, 200, 300, 500, 1000],
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

  static recordJobProcessing(jobType: string, durationSeconds: number, status: 'success' | 'failed') {
    this.jobProcessingSeconds.observe({ job_type: jobType, status }, durationSeconds);
  }

  static recordEventMetric(metricType: 'latency', value: number, deviceType: string = 'unknown') {
    if (metricType === 'latency') {
      this.eventLatency.observe({ device_type: deviceType }, value);
    }
  }
}
