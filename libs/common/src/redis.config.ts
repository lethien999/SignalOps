import Redis, { RedisOptions } from 'ioredis';

/**
 * Shared Redis Configuration for all services
 * Centralizes timeout and connection settings
 */

export function createRedisClient(): Redis {
  const config: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    // Connection timeout: 5 seconds
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
    // Command timeout: 10 seconds (including network latency)
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '10000', 10),
    // Keep-alive: 30 seconds
    keepAlive: 30000,
    // Max retries for failed commands
    maxRetriesPerRequest: 3,
    // Retry strategy with exponential backoff
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: false,
  };

  return new Redis(config);
}

/**
 * Get Redis configuration for BullMQ queue connections
 * Note: maxRetriesPerRequest must be null for BullMQ
 */
export function getRedisQueueConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '10000', 10),
    keepAlive: 30000,
    lazyConnect: false,
  };
}

/**
 * Create Redis Pub/Sub connection (for listener mode)
 * Note: Pub/Sub connections cannot be reused for regular commands
 */
export function createRedisPubSubClient(): Redis {
  const config: RedisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '10000', 10),
    keepAlive: 30000,
    lazyConnect: false,
    // For Pub/Sub, max retries per request must be null
    maxRetriesPerRequest: null,
  };

  return new Redis(config);
}
