import { buildAlertDocument } from './alert-factory';

describe('buildAlertDocument', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a stable alert payload from detected metrics', () => {
    const now = new Date('2026-04-28T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const alert = buildAlertDocument(
      {
        _id: 'event-123',
        deviceId: 'device-01',
        location: { lat: 10.77, lng: 106.7, name: 'HCM' },
        metrics: { latency: 240, packetLoss: 7, signalStrength: -95 },
      },
      {
        type: 'latency',
        severity: 'high',
        message: 'High latency detected: 240ms (threshold: 200ms)',
      },
    );

    expect(alert).toEqual({
      alertId: 'device-01-latency-1777370400000',
      deviceId: 'device-01',
      type: 'latency',
      severity: 'high',
      location: { lat: 10.77, lng: 106.7, name: 'HCM' },
      message: 'High latency detected: 240ms (threshold: 200ms)',
      status: 'open',
      createdAt: now,
      updatedAt: now,
      eventId: 'event-123',
    });
  });

  it('omits empty location names', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-28T10:00:00.000Z'));

    const alert = buildAlertDocument(
      {
        _id: 'event-456',
        deviceId: 'device-02',
        location: { lat: 11, lng: 107 },
        metrics: { latency: 260, packetLoss: 8, signalStrength: -96 },
      },
      {
        type: 'packet_loss',
        severity: 'high',
        message: 'High packet loss detected: 8% (threshold: 5%)',
      },
    );

    expect(alert.location).toEqual({ lat: 11, lng: 107 });
  });
});
