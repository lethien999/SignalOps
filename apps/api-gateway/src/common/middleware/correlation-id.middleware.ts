import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { CorrelationContextManager } from '@signalops/common';

/**
 * F4: Correlation ID Middleware
 * Gán mỗi request một ID duy nhất để theo dõi xuyên suốt log.
 * Client có thể gửi header `x-correlation-id`, nếu không hệ thống sẽ tự tạo.
 * Propagates correlationId via AsyncLocalStorage for async context tracking.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Gắn vào request để service/guard có thể truy cập
    (req as Request & { correlationId?: string }).correlationId = correlationId;

    // Trả về trong response header
    res.setHeader('x-correlation-id', correlationId);

    // Propagate via AsyncLocalStorage for tracing across async operations
    CorrelationContextManager.runAsync(correlationId, () => {
      return new Promise<void>((resolve) => {
        res.on('finish', resolve);
        res.on('close', resolve);
        next();
      });
    }).catch(next);
  }
}

