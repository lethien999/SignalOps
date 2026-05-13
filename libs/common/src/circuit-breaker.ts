/**
 * Simple Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when a service is down
 */

export type CircuitBreakerOptions = {
  failureThreshold: number; // consecutive failures before opening
  successThreshold: number; // consecutive successes before closing (half-open -> closed)
  timeout: number; // time in ms before attempting retry (open -> half-open)
};

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(
    private readonly name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000, // 1 minute
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.timeout) {
        // Timeout expired, try half-open
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN. Failing fast.`);
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount += 1;

        if (this.successCount >= this.options.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
          this.successCount = 0;
          console.log(`Circuit breaker [${this.name}] closed (service recovered)`);
        }
      } else if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0; // Reset on success
      }

      return result;
    } catch (error) {
      this.failureCount += 1;
      this.lastFailureTime = Date.now();

      if (this.state === CircuitState.HALF_OPEN) {
        // Failed during half-open, go back to open
        this.state = CircuitState.OPEN;
        this.successCount = 0;
        console.warn(`Circuit breaker [${this.name}] re-opened (recovery failed)`);
        throw error;
      }

      if (
        this.failureCount >= this.options.failureThreshold &&
        this.state === CircuitState.CLOSED
      ) {
        this.state = CircuitState.OPEN;
        console.warn(`Circuit breaker [${this.name}] opened after ${this.failureCount} failures`);
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
