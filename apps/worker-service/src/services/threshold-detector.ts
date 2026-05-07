export type DetectedAlert = {
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'warning' | 'medium' | 'high' | 'critical';
  message: string;
};

export type AlertMetricType = 'latency' | 'packet_loss' | 'signal';

type EventMetrics = {
  latency?: unknown;
  packetLoss?: unknown;
  signalStrength?: unknown;
};

type EventData = {
  metrics?: EventMetrics;
};

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

export class ThresholdDetector {
  static detectAnomalies(eventData: EventData | null | undefined): DetectedAlert[] {
    const alerts: DetectedAlert[] = [];

    const latencyThreshold = toFiniteNumber(process.env.THRESHOLD_LATENCY_MS) ?? 200;
    const packetLossThreshold = toFiniteNumber(process.env.THRESHOLD_PACKET_LOSS_PERCENT) ?? 5;
    const signalStrengthThreshold = toFiniteNumber(process.env.THRESHOLD_SIGNAL_STRENGTH_DBM) ?? -90;

    // Tiered thresholds for multi-level severity
    const latencyWarningThreshold = 150;
    const latencyCriticalThreshold = 300;
    const packetLossWarningThreshold = 3;
    const packetLossCriticalThreshold = 8;
    const signalWarningThreshold = -80;
    const signalCriticalThreshold = -100;

    const metrics = eventData?.metrics;
    if (!metrics) {
      return alerts;
    }

    const latency = toFiniteNumber(metrics.latency);
    const packetLoss = toFiniteNumber(metrics.packetLoss);
    const signalStrength = toFiniteNumber(metrics.signalStrength);

    if (latency !== null && latency > latencyWarningThreshold) {
      let severity: 'warning' | 'high' | 'critical' = 'high';
      let message = `High latency detected: ${latency}ms (threshold: ${latencyThreshold}ms)`;
      
      if (latency <= latencyWarningThreshold) {
        severity = 'warning';
        message = `Elevated latency detected: ${latency}ms (warning: ${latencyWarningThreshold}ms)`;
      } else if (latency > latencyCriticalThreshold) {
        severity = 'critical';
        message = `Critical latency detected: ${latency}ms (critical: ${latencyCriticalThreshold}ms)`;
      }
      
      alerts.push({ type: 'latency', severity, message });
    }

    if (packetLoss !== null && packetLoss > packetLossWarningThreshold) {
      let severity: 'warning' | 'high' | 'critical' = 'high';
      let message = `High packet loss detected: ${packetLoss}% (threshold: ${packetLossThreshold}%)`;
      
      if (packetLoss <= packetLossWarningThreshold) {
        severity = 'warning';
        message = `Elevated packet loss detected: ${packetLoss}% (warning: ${packetLossWarningThreshold}%)`;
      } else if (packetLoss > packetLossCriticalThreshold) {
        severity = 'critical';
        message = `Critical packet loss detected: ${packetLoss}% (critical: ${packetLossCriticalThreshold}%)`;
      }
      
      alerts.push({ type: 'packet_loss', severity, message });
    }

    if (signalStrength !== null && signalStrength < signalWarningThreshold) {
      let severity: 'warning' | 'medium' | 'critical' = 'medium';
      let message = `Low signal strength detected: ${signalStrength}dBm (threshold: ${signalStrengthThreshold}dBm)`;
      
      if (signalStrength < signalCriticalThreshold) {
        severity = 'critical';
        message = `Critical signal strength detected: ${signalStrength}dBm (critical: ${signalCriticalThreshold}dBm)`;
      } else if (signalStrength < signalStrengthThreshold) {
        severity = 'warning';
        message = `Weak signal strength detected: ${signalStrength}dBm (warning: ${signalWarningThreshold}dBm)`;
      }
      
      alerts.push({ type: 'signal', severity, message });
    }

    return alerts;
  }

  static isMetricNormal(
    alertType: AlertMetricType,
    metrics: EventMetrics | undefined,
  ): boolean {
    if (!metrics) {
      return false;
    }

    const latencyThreshold = toFiniteNumber(process.env.THRESHOLD_LATENCY_MS) ?? 200;
    const packetLossThreshold = toFiniteNumber(process.env.THRESHOLD_PACKET_LOSS_PERCENT) ?? 5;
    const signalStrengthThreshold = toFiniteNumber(process.env.THRESHOLD_SIGNAL_STRENGTH_DBM) ?? -90;

    const latency = toFiniteNumber(metrics.latency);
    const packetLoss = toFiniteNumber(metrics.packetLoss);
    const signalStrength = toFiniteNumber(metrics.signalStrength);

    if (alertType === 'latency') {
      return latency !== null && latency <= latencyThreshold;
    }

    if (alertType === 'packet_loss') {
      return packetLoss !== null && packetLoss <= packetLossThreshold;
    }

    return signalStrength !== null && signalStrength >= signalStrengthThreshold;
  }
}
