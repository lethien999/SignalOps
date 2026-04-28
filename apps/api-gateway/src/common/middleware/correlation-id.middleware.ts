import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * F4: Correlation ID Middleware
 * Gán mỗi request một ID duy nhất để theo dõi xuyên suốt log.
 * Client có thể gửi header `x-correlation-id`, nếu không hệ thống sẽ tự tạo.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();

    // Gắn vào request để service/guard có thể truy cập
    (req as any).correlationId = correlationId;

    // Trả về trong response header
    res.setHeader('x-correlation-id', correlationId);

    next();
  }
}
