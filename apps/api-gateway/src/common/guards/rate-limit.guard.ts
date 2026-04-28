import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
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

  constructor() {
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  }

  canActivate(context: ExecutionContext): boolean {
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
}
