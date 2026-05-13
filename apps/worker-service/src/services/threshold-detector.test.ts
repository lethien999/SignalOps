import { ThresholdDetector } from './threshold-detector';

describe('ThresholdDetector', () => {
  const previousLatency = process.env.THRESHOLD_LATENCY_MS;
  const previousPacketLoss = process.env.THRESHOLD_PACKET_LOSS_PERCENT;
  const previousSignalStrength = process.env.THRESHOLD_SIGNAL_STRENGTH_DBM;

  beforeEach(() => {
    process.env.THRESHOLD_LATENCY_MS = '200';
    process.env.THRESHOLD_PACKET_LOSS_PERCENT = '5';
    process.env.THRESHOLD_SIGNAL_STRENGTH_DBM = '-90';
  });

  afterAll(() => {
    process.env.THRESHOLD_LATENCY_MS = previousLatency;
    process.env.THRESHOLD_PACKET_LOSS_PERCENT = previousPacketLoss;
    process.env.THRESHOLD_SIGNAL_STRENGTH_DBM = previousSignalStrength;
  });

  it('returns no alerts for normal metrics', () => {
    const alerts = ThresholdDetector.detectAnomalies({
      metrics: {
        latency: 120,
        packetLoss: 1,
        signalStrength: -70,
      },
    });

    expect(alerts).toEqual([]);
  });

  it('detects latency, packet loss, and signal anomalies', () => {
    const alerts = ThresholdDetector.detectAnomalies({
      metrics: {
        latency: 240,
        packetLoss: 7,
        signalStrength: -99,
      },
    });

    expect(alerts).toHaveLength(3);
    expect(alerts.map((alert) => alert.type)).toEqual(['latency', 'packet_loss', 'signal']);
  });

  it('returns no alerts for invalid payloads', () => {
    expect(ThresholdDetector.detectAnomalies(null)).toEqual([]);
    expect(ThresholdDetector.detectAnomalies(undefined)).toEqual([]);
    expect(ThresholdDetector.detectAnomalies({})).toEqual([]);
    expect(
      ThresholdDetector.detectAnomalies({
        metrics: {
          latency: 'bad',
          packetLoss: null,
          signalStrength: undefined,
        },
      })
    ).toEqual([]);
  });

  it('checks metric-normal state by alert type', () => {
    const metrics = {
      latency: 150,
      packetLoss: 2,
      signalStrength: -80,
    };

    expect(ThresholdDetector.isMetricNormal('latency', metrics)).toBe(true);
    expect(ThresholdDetector.isMetricNormal('packet_loss', metrics)).toBe(true);
    expect(ThresholdDetector.isMetricNormal('signal', metrics)).toBe(true);
  });

  it('returns false for abnormal or missing metrics in isMetricNormal', () => {
    expect(
      ThresholdDetector.isMetricNormal('latency', {
        latency: 220,
      })
    ).toBe(false);
    expect(
      ThresholdDetector.isMetricNormal('packet_loss', {
        packetLoss: 8,
      })
    ).toBe(false);
    expect(
      ThresholdDetector.isMetricNormal('signal', {
        signalStrength: -100,
      })
    ).toBe(false);
    expect(ThresholdDetector.isMetricNormal('latency', undefined)).toBe(false);
  });
});
