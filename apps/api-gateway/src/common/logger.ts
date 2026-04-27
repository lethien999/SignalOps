export class Logger {
  private static logLevel = process.env.LOG_LEVEL || 'info';

  static info(message: string, data?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...(data && { data }),
      }),
    );
  }

  static error(message: string, error?: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : error ? String(error) : undefined;

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...(errorMessage && { error: errorMessage }),
      }),
    );
  }

  static warn(message: string, data?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        ...(data && { data }),
      }),
    );
  }

  static debug(message: string, data?: Record<string, unknown>) {
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
