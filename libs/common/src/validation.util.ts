export class ValidationUtil {
  private static isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private static isString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  static validateEvent(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const record = data as Record<string, unknown>;
    const location = record.location;
    const locationRecord = location && typeof location === 'object' ? (location as Record<string, unknown>) : null;

    return (
      ValidationUtil.isString(record.deviceId) &&
      ValidationUtil.isNumber(record.latency) &&
      ValidationUtil.isNumber(record.packetLoss) &&
      ValidationUtil.isNumber(record.signalStrength) &&
      !!locationRecord &&
      ValidationUtil.isNumber(locationRecord.lat) &&
      ValidationUtil.isNumber(locationRecord.lng)
    );
  }

  static validateAlert(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const record = data as Record<string, unknown>;

    return (
      ValidationUtil.isString(record.deviceId) &&
      ValidationUtil.isString(record.type) &&
      ValidationUtil.isString(record.severity) &&
      ValidationUtil.isString(record.message)
    );
  }
}
