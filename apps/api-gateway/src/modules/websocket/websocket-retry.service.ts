import { Logger } from '../../common/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * WebSocket Retry Service with Exponential Backoff
 * Handles automatic retry logic for failed WebSocket emissions
 */
export class WebSocketRetryService {
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly backoffMultiplier: number;

  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 100;
    this.maxDelayMs = options.maxDelayMs ?? 5000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
  }

  /**
   * Emit with automatic retry on failure
   * @param socket Socket instance
   * @param event Event name
   * @param payload Payload to emit
   * @param attempt Current attempt number (internal use)
   */
  async emitWithRetry<T>(
    socket: { emit: (event: string, data: unknown) => void; id: string },
    event: string,
    payload: T,
    attempt: number = 0
  ): Promise<void> {
    try {
      socket.emit(event, payload);
      if (attempt > 0) {
        Logger.debug(
          `Successfully emitted ${event} to socket ${socket.id} on attempt ${attempt + 1}`
        );
      }
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delayMs = this.calculateBackoffDelay(attempt);
        Logger.warn(
          `Emit failed for ${event} on socket ${socket.id}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.maxRetries})`,
          { error: String(error) }
        );

        await this.sleep(delayMs);
        return this.emitWithRetry(socket, event, payload, attempt + 1);
      } else {
        Logger.error(
          `Failed to emit ${event} on socket ${socket.id} after ${this.maxRetries} retries`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Batch emit with retry to multiple sockets
   * @param sockets Array of socket instances
   * @param event Event name
   * @param payload Payload to emit
   */
  async emitBatchWithRetry<T>(
    sockets: Array<{ emit: (event: string, data: unknown) => void; id: string }>,
    event: string,
    payload: T
  ): Promise<void> {
    const results = await Promise.allSettled(
      sockets.map((socket) => this.emitWithRetry(socket, event, payload))
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      Logger.warn(`Batch emit for ${event}: ${failed}/${sockets.length} sockets failed`);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt);
    const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
    return Math.min(delayWithJitter, this.maxDelayMs);
  }

  /**
   * Sleep helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance for WebSocket retry logic
 */
export const websocketRetryService = new WebSocketRetryService({
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
});
