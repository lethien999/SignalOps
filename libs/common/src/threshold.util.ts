/**
 * Shared threshold detection logic
 * Used by both API Gateway (EventService.getDevices) and Worker Service
 */

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export type AlertMetricType = 'latency' | 'packet_loss' | 'signal';

type EventMetrics = {
  latency?: unknown;
  packetLoss?: unknown;
  signalStrength?: unknown;
};

/**
 * Get threshold values from environment or defaults
 */
export function getThresholdValues() {
  return {
    latencyThreshold: toFiniteNumber(process.env.THRESHOLD_LATENCY_MS) ?? 200,
    packetLossThreshold: toFiniteNumber(process.env.THRESHOLD_PACKET_LOSS_PERCENT) ?? 5,
    signalStrengthThreshold: toFiniteNumber(process.env.THRESHOLD_SIGNAL_STRENGTH_DBM) ?? -90,
  };
}

/**
 * Check if metrics are within normal range (no alerts)
 * Returns true if all metrics are healthy
 */
export function areMetricsNormal(metrics: EventMetrics | undefined): boolean {
  if (!metrics) {
    return false;
  }

  const thresholds = getThresholdValues();

  const latency = toFiniteNumber(metrics.latency);
  const packetLoss = toFiniteNumber(metrics.packetLoss);
  const signalStrength = toFiniteNumber(metrics.signalStrength);

  // All metrics must be within normal range
  const latencyOk = latency === null || latency <= thresholds.latencyThreshold;
  const packetLossOk = packetLoss === null || packetLoss <= thresholds.packetLossThreshold;
  const signalStrengthOk = signalStrength === null || signalStrength >= thresholds.signalStrengthThreshold;

  return latencyOk && packetLossOk && signalStrengthOk;
}

/**
 * Check if a specific metric is in alert state
 */
export function isMetricInAlert(metrics: EventMetrics | undefined): boolean {
  return !areMetricsNormal(metrics);
}

/**
 * Determine device status based on metrics
 */
export function getDeviceStatus(metrics: EventMetrics | undefined): 'active' | 'alert' {
  return isMetricInAlert(metrics) ? 'alert' : 'active';
}
