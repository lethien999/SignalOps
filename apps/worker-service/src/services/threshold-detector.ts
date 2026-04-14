export class ThresholdDetector {
  static detectAnomalies(eventData: any): Array<{ type: string; severity: string; message: string }> {
    const alerts: Array<{ type: string; severity: string; message: string }> = [];

    const latencyThreshold = parseInt(process.env.THRESHOLD_LATENCY_MS || '200', 10);
    const packetLossThreshold = parseInt(process.env.THRESHOLD_PACKET_LOSS_PERCENT || '5', 10);
    const signalStrengthThreshold = parseInt(
      process.env.THRESHOLD_SIGNAL_STRENGTH_DBM || '-90',
      10,
    );

    // Check latency
    if (eventData.metrics.latency > latencyThreshold) {
      alerts.push({
        type: 'latency',
        severity: 'high',
        message: `High latency detected: ${eventData.metrics.latency}ms (threshold: ${latencyThreshold}ms)`,
      });
    }

    // Check packet loss
    if (eventData.metrics.packetLoss > packetLossThreshold) {
      alerts.push({
        type: 'packet_loss',
        severity: 'high',
        message: `High packet loss detected: ${eventData.metrics.packetLoss}% (threshold: ${packetLossThreshold}%)`,
      });
    }

    // Check signal strength
    if (eventData.metrics.signalStrength < signalStrengthThreshold) {
      alerts.push({
        type: 'signal',
        severity: 'medium',
        message: `Low signal strength detected: ${eventData.metrics.signalStrength}dBm (threshold: ${signalStrengthThreshold}dBm)`,
      });
    }

    return alerts;
  }
}
