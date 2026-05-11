import * as ort from 'onnxruntime-node';

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

const AI_MODEL_VERSION = 'ml-shadow-v2';
const MODEL_PATH = 'src/assets/anomaly-model.onnx';

let onnxSession: ort.InferenceSession | null = null;
let onnxInitPromise: Promise<void> | null = null;

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

function softmax(values: number[]): number[] {
  const maxValue = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - maxValue));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

function buildFeatureVector(metrics: Metrics) {
  const latency = Math.min(Math.max(metrics.latency ?? 0, 0), 500);
  const packetLoss = Math.min(Math.max(metrics.packetLoss ?? 0, 0), 20);
  const signalStrength = Math.min(Math.max(metrics.signalStrength ?? -80, -120), -40);

  const latencyNorm = latency / 500;
  const packetLossNorm = packetLoss / 20;
  const signalStrengthNorm = (signalStrength - (-120)) / 80;
  const overallQuality = 1 - (latencyNorm + packetLossNorm + signalStrengthNorm) / 3;
  const now = new Date();

  return [
    latencyNorm,
    packetLossNorm,
    signalStrengthNorm,
    overallQuality,
    now.getHours(),
    now.getDay(),
  ];
}

async function ensureOnnxSession() {
  if (onnxSession) return onnxSession;
  if (!onnxInitPromise) {
    onnxInitPromise = (async () => {
      try {
        onnxSession = await ort.InferenceSession.create(MODEL_PATH);
        console.log(`✓ ML model loaded from ${MODEL_PATH}`);
      } catch (error) {
        console.warn(`⚠ Unable to load ML model at ${MODEL_PATH}; falling back to deterministic scoring`, error);
        onnxSession = null;
      }
    })();
  }

  await onnxInitPromise;
  return onnxSession;
}

export async function initMLModel(): Promise<void> {
  await ensureOnnxSession();
}

async function scoreWithMlModel(metrics: Metrics): Promise<AnomalyScoreResult | null> {
  const session = await ensureOnnxSession();
  if (!session) return null;

  const features = buildFeatureVector(metrics);
  const tensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames.find((name) => name.toLowerCase().includes('prob')) ?? session.outputNames[0];
  const results = await session.run({ [inputName]: tensor });
  const rawOutput = results[outputName] as ort.Tensor | undefined;

  if (!rawOutput) return null;

  const outputValues = Array.from(rawOutput.data as Float32Array | Float64Array | Int32Array | Uint32Array).map((value) => Number(value));
  const anomalyProbability = outputValues.length > 1 ? softmax(outputValues)[1] : Math.min(Math.max(outputValues[0] ?? 0, 0), 1);
  const anomalyScore = clamp(Math.round(anomalyProbability * 100), 0, 100);
  const mlDecisionThreshold = parseInt(process.env.ANOMALY_THRESHOLD || process.env.AI_ANOMALY_THRESHOLD || '80', 10);
  const anomalyLabel = anomalyScore >= mlDecisionThreshold ? 'anomalous' : anomalyScore >= 35 ? 'suspicious' : 'normal';

  return {
    aiModelVersion: AI_MODEL_VERSION,
    anomalyScore,
    anomalyConfidence: anomalyScore,
    anomalyReasons: [
      `ML inference score ${anomalyScore}/100`,
      `Model confidence ${(anomalyProbability * 100).toFixed(1)}%`,
    ],
    anomalyLabel,
  };
}

function scoreWithDeterministic(metrics: Metrics | null | undefined, thresholdProfile: ThresholdProfile): AnomalyScoreResult {
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

export async function scoreEventAnomaly(
  metrics: Metrics | null | undefined,
  thresholdProfile?: ThresholdProfile,
): Promise<AnomalyScoreResult> {
  const mlResult = metrics ? await scoreWithMlModel(metrics) : null;
  if (mlResult) {
    return mlResult;
  }

  return scoreWithDeterministic(metrics, thresholdProfile);
}
