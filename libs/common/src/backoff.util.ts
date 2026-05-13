/**
 * Backoff strategies with jitter to prevent thundering herd problem
 */

/**
 * Exponential backoff with jitter
 * Adds randomness to prevent synchronized retries across multiple workers
 * Formula: baseDelay * (2 ^ attempt) + random(0, jitterFactor * baseDelay)
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelay: number = 2000,
  jitterFactor: number = 0.1 // 10% jitter
): number {
  // Exponential backoff: 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 5)); // Cap at 2^5 to avoid overflow
  // Add random jitter to spread out retries
  const jitter = Math.random() * exponentialDelay * jitterFactor;
  return exponentialDelay + jitter;
}

/**
 * Linear backoff with jitter
 * Formula: baseDelay * attempt + random(0, jitterFactor * baseDelay)
 */
export function calculateLinearBackoffWithJitter(
  attempt: number,
  baseDelay: number = 1000,
  jitterFactor: number = 0.1
): number {
  const linearDelay = baseDelay * attempt;
  const jitter = Math.random() * baseDelay * jitterFactor;
  return linearDelay + jitter;
}

/**
 * Full jitter backoff (recommended)
 * Formula: random(0, min(baseDelay * (2 ^ attempt), maxDelay))
 * This spreads retries across the entire range, providing best distribution
 */
export function calculateFullJitterBackoff(
  attempt: number,
  baseDelay: number = 2000,
  maxDelay: number = 32000
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return Math.random() * exponentialDelay;
}
