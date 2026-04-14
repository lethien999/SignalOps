export class ValidationUtil {
  private static isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private static isString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  static validateEvent(data: any): boolean {
    return (
      ValidationUtil.isString(data.deviceId) &&
      ValidationUtil.isNumber(data.latency) &&
      ValidationUtil.isNumber(data.packetLoss) &&
      ValidationUtil.isNumber(data.signalStrength) &&
      data.location &&
      ValidationUtil.isNumber(data.location.lat) &&
      ValidationUtil.isNumber(data.location.lng)
    );
  }

  static validateAlert(data: any): boolean {
    return (
      ValidationUtil.isString(data.deviceId) &&
      ValidationUtil.isString(data.type) &&
      ValidationUtil.isString(data.severity) &&
      ValidationUtil.isString(data.message)
    );
  }
}
