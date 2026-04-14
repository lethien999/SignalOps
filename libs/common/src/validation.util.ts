import { isNumber, isString } from 'class-validator';

export class ValidationUtil {
  static validateEvent(data: any): boolean {
    return (
      isString(data.deviceId) &&
      isNumber(data.latency) &&
      isNumber(data.packetLoss) &&
      isNumber(data.signalStrength) &&
      data.location &&
      isNumber(data.location.lat) &&
      isNumber(data.location.lng)
    );
  }

  static validateAlert(data: any): boolean {
    return (
      isString(data.deviceId) &&
      isString(data.type) &&
      isString(data.severity) &&
      isString(data.message)
    );
  }
}
