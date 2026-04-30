export class Logger {
  static info(message: string, data?: unknown) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...(data !== undefined && { data }),
      }),
    );
  }

  static error(message: string, errorMsg?: string) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...(errorMsg && { error: errorMsg }),
      }),
    );
  }
}
