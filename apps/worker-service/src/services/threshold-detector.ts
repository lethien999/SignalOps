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

export type ThresholdProfile = {
  latencyWarningMs: number;
  latencyCriticalMs: number;
  packetLossWarningPercent: number;
  packetLossCriticalPercent: number;
  signalWarningDbm: number;
  signalCriticalDbm: number;
};

const defaultThresholdProfile: ThresholdProfile = {
  latencyWarningMs: 150,
  latencyCriticalMs: 300,
  packetLossWarningPercent: 3,
  packetLossCriticalPercent: 8,
  signalWarningDbm: -80,
  signalCriticalDbm: -100,
};

function normalizeThresholdProfile(profile?: Partial<ThresholdProfile> | null): ThresholdProfile {
  return {
    latencyWarningMs: toFiniteNumber(profile?.latencyWarningMs) ?? defaultThresholdProfile.latencyWarningMs,
    latencyCriticalMs: toFiniteNumber(profile?.latencyCriticalMs) ?? defaultThresholdProfile.latencyCriticalMs,
    packetLossWarningPercent: toFiniteNumber(profile?.packetLossWarningPercent) ?? defaultThresholdProfile.packetLossWarningPercent,
    packetLossCriticalPercent: toFiniteNumber(profile?.packetLossCriticalPercent) ?? defaultThresholdProfile.packetLossCriticalPercent,
    signalWarningDbm: toFiniteNumber(profile?.signalWarningDbm) ?? defaultThresholdProfile.signalWarningDbm,
    signalCriticalDbm: toFiniteNumber(profile?.signalCriticalDbm) ?? defaultThresholdProfile.signalCriticalDbm,
  };
}

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
  static detectAnomalies(eventData: EventData | null | undefined, thresholdProfile?: Partial<ThresholdProfile> | null): DetectedAlert[] {
    const alerts: DetectedAlert[] = [];

    const thresholds = normalizeThresholdProfile(thresholdProfile);

    const metrics = eventData?.metrics;
    if (!metrics) {
      return alerts;
    }

    const latency = toFiniteNumber(metrics.latency);
    const packetLoss = toFiniteNumber(metrics.packetLoss);
    const signalStrength = toFiniteNumber(metrics.signalStrength);

    if (latency !== null && latency > thresholds.latencyWarningMs) {
      let severity: 'warning' | 'high' | 'critical' = 'high';
      let message = `High latency detected: ${latency}ms (ngưỡng: ${thresholds.latencyWarningMs}ms)`;
      
      if (latency <= thresholds.latencyWarningMs) {
        severity = 'warning';
        message = `Latency tăng: ${latency}ms (cảnh báo: ${thresholds.latencyWarningMs}ms)`;
      } else if (latency > thresholds.latencyCriticalMs) {
        severity = 'critical';
        message = `Latency tới hạn: ${latency}ms (tới hạn: ${thresholds.latencyCriticalMs}ms)`;
      }
      
      alerts.push({ type: 'latency', severity, message });
    }

    if (packetLoss !== null && packetLoss > thresholds.packetLossWarningPercent) {
      let severity: 'warning' | 'high' | 'critical' = 'high';
      let message = `High packet loss detected: ${packetLoss}% (ngưỡng: ${thresholds.packetLossWarningPercent}%)`;
      
      if (packetLoss <= thresholds.packetLossWarningPercent) {
        severity = 'warning';
        message = `Packet loss tăng: ${packetLoss}% (cảnh báo: ${thresholds.packetLossWarningPercent}%)`;
      } else if (packetLoss > thresholds.packetLossCriticalPercent) {
        severity = 'critical';
        message = `Packet loss tới hạn: ${packetLoss}% (tới hạn: ${thresholds.packetLossCriticalPercent}%)`;
      }
      
      alerts.push({ type: 'packet_loss', severity, message });
    }

    if (signalStrength !== null && signalStrength < thresholds.signalWarningDbm) {
      let severity: 'warning' | 'medium' | 'critical' = 'medium';
      let message = `Low signal strength detected: ${signalStrength}dBm (ngưỡng: ${thresholds.signalWarningDbm}dBm)`;
      
      if (signalStrength < thresholds.signalCriticalDbm) {
        severity = 'critical';
        message = `Signal strength tới hạn: ${signalStrength}dBm (tới hạn: ${thresholds.signalCriticalDbm}dBm)`;
      } else if (signalStrength < thresholds.signalWarningDbm) {
        severity = 'warning';
        message = `Signal strength yếu: ${signalStrength}dBm (cảnh báo: ${thresholds.signalWarningDbm}dBm)`;
      }
      
      alerts.push({ type: 'signal', severity, message });
    }

    return alerts;
  }

  static isMetricNormal(
    alertType: AlertMetricType,
    metrics: EventMetrics | undefined,
    thresholdProfile?: Partial<ThresholdProfile> | null,
  ): boolean {
    if (!metrics) {
      return false;
    }

    const thresholds = normalizeThresholdProfile(thresholdProfile);

    const latency = toFiniteNumber(metrics.latency);
    const packetLoss = toFiniteNumber(metrics.packetLoss);
    const signalStrength = toFiniteNumber(metrics.signalStrength);

    if (alertType === 'latency') {
      return latency !== null && latency <= thresholds.latencyCriticalMs;
    }

    if (alertType === 'packet_loss') {
      return packetLoss !== null && packetLoss <= thresholds.packetLossCriticalPercent;
    }

    return signalStrength !== null && signalStrength >= thresholds.signalWarningDbm;
  }
}
