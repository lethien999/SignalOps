import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from '../logger';

/**
 * Rate limiter đơn giản dựa trên IP.
 * Giới hạn số request/phút cho mỗi IP.
 * Cấu hình qua biến môi trường: RATE_LIMIT_MAX (mặc định 100), RATE_LIMIT_WINDOW_MS (mặc định 60000).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { count: number; resetAt: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly useRedis: boolean;
  private readonly redisClient?: Redis;

  constructor() {
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    this.useRedis = String(process.env.REDIS_ENABLED || 'false').toLowerCase() === 'true';

    if (this.useRedis) {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.useRedis && this.redisClient) {
      return this.canActivateWithRedis(context);
    }

    return this.canActivateInMemory(context);
  }

  private canActivateInMemory(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = this.requests.get(ip);

    if (!entry || now > entry.resetAt) {
      this.requests.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count += 1;

    if (entry.count > this.maxRequests) {
      Logger.warn(`Rate limit exceeded for IP: ${ip}`, { count: entry.count });
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Quá nhiều request. Giới hạn ${this.maxRequests} request/${this.windowMs / 1000}s. Vui lòng thử lại sau.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async canActivateWithRedis(context: ExecutionContext): Promise<boolean> {
    const redisClient = this.redisClient;
    if (!redisClient) {
      return this.canActivateInMemory(context);
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const bucket = Math.floor(Date.now() / this.windowMs);
    const key = `ratelimit:${ip}:${bucket}`;

    try {
      const results = await redisClient
        .multi()
        .incr(key)
        .pexpire(key, this.windowMs)
        .exec();

      const count = Number(results?.[0]?.[1] ?? 0);

      if (response?.setHeader) {
        response.setHeader('X-RateLimit-Limit', String(this.maxRequests));
        response.setHeader('X-RateLimit-Remaining', String(Math.max(this.maxRequests - count, 0)));
      }

      if (count > this.maxRequests) {
        Logger.warn(`Rate limit exceeded for IP (Redis): ${ip}`, { count });
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Quá nhiều request. Giới hạn ${this.maxRequests} request/${this.windowMs / 1000}s. Vui lòng thử lại sau.`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      Logger.warn('Redis rate-limit check failed; fallback to allow request', {
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }
}
