/**
 * Feature Extraction for ML Training
 *
 * Extracts features from raw events for machine learning models
 */

import { normalizeMetrics } from './data-normalization';

export interface RawEvent {
  _id: string;
  deviceId: string;
  metrics: {
    latency: number;
    packetLoss: number;
    signalStrength: number;
  };
  timestamp: Date;
  createdAt: Date;
}

export interface TrainingFeatures {
  // Normalized metrics
  latency_norm: number;
  packetLoss_norm: number;
  signalStrength_norm: number;
  overall_quality: number;

  // Time-based features
  hour_of_day: number; // 0-23
  day_of_week: number; // 0-6 (Sunday-Saturday)

  // Change detection features (requires context)
  metric_volatility?: number; // Standard deviation of recent metrics
  change_magnitude?: number; // Magnitude of recent change

  // Metadata
  deviceId: string;
  timestamp: Date;
}

/**
 * Extract time-based features from timestamp
 */
function extractTimeFeatures(timestamp: Date): {
  hour_of_day: number;
  day_of_week: number;
} {
  return {
    hour_of_day: timestamp.getHours(),
    day_of_week: timestamp.getDay(),
  };
}

/**
 * Extract features from a single event
 */
export function extractEventFeatures(event: RawEvent): TrainingFeatures {
  const normalized = normalizeMetrics(event.metrics);
  const timeFeatures = extractTimeFeatures(event.timestamp);

  return {
    latency_norm: normalized.latency_norm,
    packetLoss_norm: normalized.packetLoss_norm,
    signalStrength_norm: normalized.signalStrength_norm,
    overall_quality: normalized.overall_quality,
    hour_of_day: timeFeatures.hour_of_day,
    day_of_week: timeFeatures.day_of_week,
    deviceId: event.deviceId,
    timestamp: event.timestamp,
  };
}

/**
 * Calculate metric volatility (standard deviation) from recent events
 */
export function calculateMetricVolatility(
  recentEvents: RawEvent[],
  metricKey: 'latency' | 'packetLoss' | 'signalStrength'
): number {
  if (recentEvents.length < 2) return 0;

  const values = recentEvents.map((e) => e.metrics[metricKey]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate magnitude of recent metric change
 */
export function calculateChangeMagnitude(
  recentEvents: RawEvent[],
  metricKey: 'latency' | 'packetLoss' | 'signalStrength'
): number {
  if (recentEvents.length < 2) return 0;

  const latest = recentEvents[recentEvents.length - 1].metrics[metricKey];
  const previous = recentEvents[recentEvents.length - 2].metrics[metricKey];
  return Math.abs(latest - previous);
}

/**
 * Extract features from an event with context (volatility, change)
 */
export function extractEventFeaturesWithContext(
  event: RawEvent,
  contextEvents: RawEvent[] = []
): TrainingFeatures {
  const baseFeatures = extractEventFeatures(event);

  if (contextEvents.length > 0) {
    baseFeatures.metric_volatility =
      (calculateMetricVolatility(contextEvents, 'latency') +
        calculateMetricVolatility(contextEvents, 'packetLoss') +
        calculateMetricVolatility(contextEvents, 'signalStrength')) /
      3;

    baseFeatures.change_magnitude =
      (calculateChangeMagnitude(contextEvents, 'latency') +
        calculateChangeMagnitude(contextEvents, 'packetLoss') +
        calculateChangeMagnitude(contextEvents, 'signalStrength')) /
      3;
  }

  return baseFeatures;
}

/**
 * Feature vector format for CSV export
 */
export interface FeatureVector extends TrainingFeatures {
  anomalous: 0 | 1; // 0 = normal, 1 = anomalous (based on alert existence)
  eventId: string;
}

/**
 * Convert features to CSV row
 */
export function featuresToCSVRow(vector: FeatureVector): Record<string, string | number> {
  return {
    eventId: vector.eventId,
    deviceId: vector.deviceId,
    timestamp: vector.timestamp.toISOString(),
    latency_norm: vector.latency_norm.toFixed(4),
    packetLoss_norm: vector.packetLoss_norm.toFixed(4),
    signalStrength_norm: vector.signalStrength_norm.toFixed(4),
    overall_quality: vector.overall_quality.toFixed(4),
    hour_of_day: vector.hour_of_day,
    day_of_week: vector.day_of_week,
    metric_volatility: (vector.metric_volatility ?? 0).toFixed(4),
    change_magnitude: (vector.change_magnitude ?? 0).toFixed(4),
    anomalous: vector.anomalous,
  };
}

/**
 * CSV header row
 */
export const CSV_HEADERS = [
  'eventId',
  'deviceId',
  'timestamp',
  'latency_norm',
  'packetLoss_norm',
  'signalStrength_norm',
  'overall_quality',
  'hour_of_day',
  'day_of_week',
  'metric_volatility',
  'change_magnitude',
  'anomalous',
];
