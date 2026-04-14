export class Logger {
  private static logLevel = process.env.LOG_LEVEL || 'info';

  static info(message: string, data?: any) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...(data && { data }),
      }),
    );
  }

  static error(message: string, error?: any) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...(error && { error: error.message || error }),
      }),
    );
  }

  static warn(message: string, data?: any) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        ...(data && { data }),
      }),
    );
  }

  static debug(message: string, data?: any) {
    if (this.logLevel === 'debug') {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          message,
          ...(data && { data }),
        }),
      );
    }
  }
}
