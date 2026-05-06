import { Logger } from './logger';
import { CircuitBreaker, CircuitBreakerOptions } from '@signalops/common';

/**
 * Repository wrapper with circuit breaker protection
 * Prevents cascading failures when MongoDB is temporarily unavailable
 */
export abstract class CircuitBreakerRepository {
  protected readonly mongoBreaker: CircuitBreaker;

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    this.mongoBreaker = new CircuitBreaker(`MongoDB-${name}`, {
      failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD || '5', 10),
      successThreshold: parseInt(process.env.CB_SUCCESS_THRESHOLD || '2', 10),
      timeout: parseInt(process.env.CB_TIMEOUT_MS || '60000', 10),
      ...options,
    });
  }

  /**
   * Wrap MongoDB operations with circuit breaker
   */
  protected async withCircuitBreaker<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.mongoBreaker.execute(fn);
    } catch (error) {
      Logger.error(`Repository operation [${operation}] failed`, error);
      throw error;
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return this.mongoBreaker.getMetrics();
  }
}
