export type DetectedAlert = {
  type: 'latency' | 'packet_loss' | 'signal';
  severity: 'low' | 'medium' | 'high';
  message: string;
};

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

    const metrics = eventData?.metrics;
    if (!metrics) {
      return alerts;
    }

    const latency = toFiniteNumber(metrics.latency);
    const packetLoss = toFiniteNumber(metrics.packetLoss);
    const signalStrength = toFiniteNumber(metrics.signalStrength);

    if (latency !== null && latency > latencyThreshold) {
      alerts.push({
        type: 'latency',
        severity: 'high',
        message: `High latency detected: ${latency}ms (threshold: ${latencyThreshold}ms)`,
      });
    }

    if (packetLoss !== null && packetLoss > packetLossThreshold) {
      alerts.push({
        type: 'packet_loss',
        severity: 'high',
        message: `High packet loss detected: ${packetLoss}% (threshold: ${packetLossThreshold}%)`,
      });
    }

    if (signalStrength !== null && signalStrength < signalStrengthThreshold) {
      alerts.push({
        type: 'signal',
        severity: 'medium',
        message: `Low signal strength detected: ${signalStrength}dBm (threshold: ${signalStrengthThreshold}dBm)`,
      });
    }

    return alerts;
  }
}
