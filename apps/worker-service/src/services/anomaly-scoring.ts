type Metrics = {
  latency?: number;
  packetLoss?: number;
  signalStrength?: number;
};

type ThresholdProfile = {
  latencyWarningMs: number;
  latencyCriticalMs: number;
  packetLossWarningPercent: number;
  packetLossCriticalPercent: number;
  signalWarningDbm: number;
  signalCriticalDbm: number;
} | null | undefined;

type AnomalyScoreResult = {
  aiModelVersion: string;
  anomalyScore: number;
  anomalyConfidence: number;
  anomalyReasons: string[];
  anomalyLabel: 'normal' | 'suspicious' | 'anomalous';
};

const AI_MODEL_VERSION = 'shadow-heuristic-v1';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeThresholdProfile(thresholdProfile: ThresholdProfile) {
  return {
    latencyWarningMs: thresholdProfile?.latencyWarningMs ?? 200,
    latencyCriticalMs: thresholdProfile?.latencyCriticalMs ?? 400,
    packetLossWarningPercent: thresholdProfile?.packetLossWarningPercent ?? 5,
    packetLossCriticalPercent: thresholdProfile?.packetLossCriticalPercent ?? 12,
    signalWarningDbm: thresholdProfile?.signalWarningDbm ?? -90,
    signalCriticalDbm: thresholdProfile?.signalCriticalDbm ?? -110,
  };
}

function pushReason(reasons: string[], text: string, scoreBoost: number) {
  reasons.push(`${text} (+${scoreBoost})`);
  return scoreBoost;
}

export function scoreEventAnomaly(
  metrics: Metrics | null | undefined,
  thresholdProfile?: ThresholdProfile,
): AnomalyScoreResult {
  const thresholds = normalizeThresholdProfile(thresholdProfile);
  const reasons: string[] = [];
  let score = 5;

  if (!metrics) {
    return {
      aiModelVersion: AI_MODEL_VERSION,
      anomalyScore: 0,
      anomalyConfidence: 0,
      anomalyReasons: ['Không có dữ liệu metrics để chấm điểm'],
      anomalyLabel: 'normal',
    };
  }

  const latency = typeof metrics.latency === 'number' ? metrics.latency : null;
  const packetLoss = typeof metrics.packetLoss === 'number' ? metrics.packetLoss : null;
  const signalStrength = typeof metrics.signalStrength === 'number' ? metrics.signalStrength : null;

  if (latency !== null) {
    if (latency >= thresholds.latencyCriticalMs) {
      score += pushReason(reasons, `Latency ${latency}ms vượt ngưỡng critical ${thresholds.latencyCriticalMs}ms`, 35);
    } else if (latency >= thresholds.latencyWarningMs) {
      score += pushReason(reasons, `Latency ${latency}ms vượt ngưỡng warning ${thresholds.latencyWarningMs}ms`, 18);
    } else if (latency >= thresholds.latencyWarningMs * 0.8) {
      score += pushReason(reasons, `Latency ${latency}ms tiến gần ngưỡng warning`, 8);
    }
  }

  if (packetLoss !== null) {
    if (packetLoss >= thresholds.packetLossCriticalPercent) {
      score += pushReason(reasons, `Packet loss ${packetLoss}% vượt ngưỡng critical ${thresholds.packetLossCriticalPercent}%`, 32);
    } else if (packetLoss >= thresholds.packetLossWarningPercent) {
      score += pushReason(reasons, `Packet loss ${packetLoss}% vượt ngưỡng warning ${thresholds.packetLossWarningPercent}%`, 16);
    } else if (packetLoss >= thresholds.packetLossWarningPercent * 0.75) {
      score += pushReason(reasons, `Packet loss ${packetLoss}% tăng cao bất thường`, 8);
    }
  }

  if (signalStrength !== null) {
    if (signalStrength <= thresholds.signalCriticalDbm) {
      score += pushReason(reasons, `Signal ${signalStrength} dBm thấp hơn ngưỡng critical ${thresholds.signalCriticalDbm} dBm`, 30);
    } else if (signalStrength <= thresholds.signalWarningDbm) {
      score += pushReason(reasons, `Signal ${signalStrength} dBm thấp hơn ngưỡng warning ${thresholds.signalWarningDbm} dBm`, 15);
    } else if (signalStrength <= thresholds.signalWarningDbm + 5) {
      score += pushReason(reasons, `Signal ${signalStrength} dBm tiến gần ngưỡng warning`, 6);
    }
  }

  if (latency !== null && packetLoss !== null && latency >= thresholds.latencyWarningMs && packetLoss >= thresholds.packetLossWarningPercent) {
    score += pushReason(reasons, 'Latency và packet loss cùng tăng đồng thời', 12);
  }

  if (latency !== null && signalStrength !== null && latency >= thresholds.latencyWarningMs && signalStrength <= thresholds.signalWarningDbm) {
    score += pushReason(reasons, 'Latency cao đi kèm tín hiệu yếu', 8);
  }

  const anomalyScore = clamp(Math.round(score), 0, 100);
  const confidence = clamp(Math.round(anomalyScore * 0.9), 0, 100);
  const anomalyLabel = anomalyScore >= 70 ? 'anomalous' : anomalyScore >= 35 ? 'suspicious' : 'normal';

  if (reasons.length === 0) {
    reasons.push('Chưa thấy tín hiệu bất thường rõ rệt, chỉ số đang ổn định');
  }

  return {
    aiModelVersion: AI_MODEL_VERSION,
    anomalyScore,
    anomalyConfidence: confidence,
    anomalyReasons: reasons.slice(0, 4),
    anomalyLabel,
  };
}
