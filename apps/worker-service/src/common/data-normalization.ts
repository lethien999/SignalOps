/**
 * Data Normalization Utilities for ML Training
 * 
 * Handles normalization of metrics across different ranges
 * to prepare data for machine learning models.
 */

/**
 * Normalize value to 0-1 range using min-max scaling
 */
export function normalizeMinMax(value: number, min: number, max: number): number {
  if (max === min) return 0.5; // Avoid division by zero
  return (value - min) / (max - min);
}

/**
 * Normalize using standard scaling (z-score)
 * @param value The value to normalize
 * @param mean The mean of the dataset
 * @param stddev The standard deviation
 */
export function normalizeZScore(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return 0;
  return (value - mean) / stddev;
}

/**
 * Normalize latency (0-500ms scale)
 * @param latency Latency in milliseconds
 * @returns Normalized value 0-1
 */
export function normalizeLatency(latency: number): number {
  // 0ms = 0.0, 500ms = 1.0, cap at 500
  return normalizeMinMax(Math.min(Math.max(latency, 0), 500), 0, 500);
}

/**
 * Normalize packet loss (0-20% scale)
 * @param packetLoss Packet loss percentage (0-100)
 * @returns Normalized value 0-1
 */
export function normalizePacketLoss(packetLoss: number): number {
  // 0% = 0.0, 20% = 1.0, cap at 20
  return normalizeMinMax(Math.min(Math.max(packetLoss, 0), 20), 0, 20);
}

/**
 * Normalize signal strength (-120 to -40 dBm scale)
 * @param signalStrength Signal strength in dBm (typically -120 to 0)
 * @returns Normalized value 0-1 (worse signal = higher value)
 */
export function normalizeSignalStrength(signalStrength: number): number {
  // -40 dBm (best) = 0.0, -120 dBm (worst) = 1.0
  return normalizeMinMax(Math.min(Math.max(signalStrength, -120), -40), -120, -40);
}

/**
 * Normalize metrics for ML training
 */
export interface NormalizedMetrics {
  latency_norm: number;
  packetLoss_norm: number;
  signalStrength_norm: number;
  // Composite features
  overall_quality: number; // Inverse of average degradation
}

export function normalizeMetrics(metrics: {
  latency: number;
  packetLoss: number;
  signalStrength: number;
}): NormalizedMetrics {
  const latency_norm = normalizeLatency(metrics.latency);
  const packetLoss_norm = normalizePacketLoss(metrics.packetLoss);
  const signalStrength_norm = normalizeSignalStrength(metrics.signalStrength);

  // Overall quality: average degradation inverted (1.0 = all perfect, 0.0 = all worst)
  const overall_quality = 1 - (latency_norm + packetLoss_norm + signalStrength_norm) / 3;

  return {
    latency_norm,
    packetLoss_norm,
    signalStrength_norm,
    overall_quality,
  };
}

/**
 * Denormalize normalized value back to original scale (inverse of normalizeMinMax)
 */
export function denormalizeMinMax(normalized: number, min: number, max: number): number {
  if (max === min) return min;
  return normalized * (max - min) + min;
}

/**
 * Denormalize latency
 */
export function denormalizeLatency(normalized: number): number {
  return denormalizeMinMax(normalized, 0, 500);
}

/**
 * Denormalize packet loss
 */
export function denormalizePacketLoss(normalized: number): number {
  return denormalizeMinMax(normalized, 0, 20);
}

/**
 * Denormalize signal strength
 */
export function denormalizeSignalStrength(normalized: number): number {
  return denormalizeMinMax(normalized, -120, -40);
}
