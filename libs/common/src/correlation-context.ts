import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/**
 * Correlation Context for distributed tracing
 * Tracks requests and their related operations across the system
 */

export type CorrelationContext = {
  correlationId: string;
  startTime: number;
};

class CorrelationContextManager {
  private static readonly store = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Run a function within a correlation context
   */
  static run<T>(correlationId: string, fn: () => T): T {
    const context: CorrelationContext = {
      correlationId,
      startTime: Date.now(),
    };
    return this.store.run(context, fn);
  }

  /**
   * Run an async function within a correlation context
   */
  static async runAsync<T>(correlationId: string, fn: () => Promise<T>): Promise<T> {
    const context: CorrelationContext = {
      correlationId,
      startTime: Date.now(),
    };
    return this.store.run(context, fn);
  }

  /**
   * Get current correlation context
   */
  static getContext(): CorrelationContext | undefined {
    return this.store.getStore();
  }

  /**
   * Get current correlation ID
   */
  static getCorrelationId(): string {
    return this.getContext()?.correlationId || randomUUID();
  }

  /**
   * Get time elapsed in current context
   */
  static getElapsedMs(): number {
    const context = this.getContext();
    return context ? Date.now() - context.startTime : 0;
  }
}

export default CorrelationContextManager;
