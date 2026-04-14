export class DateUtil {
  static now(): Date {
    return new Date();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static isOlderThan(date: Date, minutes: number): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / 60000;
    return diffMinutes > minutes;
  }
}
