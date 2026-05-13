import { CorrelationContextManager } from '@signalops/common';

export class Logger {
  private static getCorrelationId(): string | undefined {
    try {
      return CorrelationContextManager.getCorrelationId();
    } catch {
      return undefined;
    }
  }

  private static buildLogEntry(level: string, message: string, data?: Record<string, unknown>) {
    const correlationId = this.getCorrelationId();
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(correlationId && { correlationId }),
      ...(data && { data }),
    });
  }

  static info(message: string, data?: Record<string, unknown>) {
    console.log(this.buildLogEntry('info', message, data));
  }

  static error(message: string, error?: unknown) {
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;

    const entry = this.buildLogEntry('error', message, {
      ...(errorMessage && { error: errorMessage }),
    });
    console.error(entry);
  }

  static warn(message: string, data?: Record<string, unknown>) {
    console.warn(this.buildLogEntry('warn', message, data));
  }
}
