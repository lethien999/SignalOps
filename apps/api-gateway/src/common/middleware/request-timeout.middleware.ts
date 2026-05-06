import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';

/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely
 * Default: 30 seconds for API requests
 */
@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  private readonly timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

  use(req: Request, res: Response, next: NextFunction) {
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        Logger.warn(`Request timeout for ${req.method} ${req.path} after ${this.timeoutMs}ms`);
        res.status(408).json({
          statusCode: 408,
          message: 'Request Timeout',
          error: 'The server did not receive a complete request in time.',
        });
      }
    }, this.timeoutMs);

    // Clear timeout when response ends
    res.on('finish', () => clearTimeout(timeoutHandle));
    res.on('close', () => clearTimeout(timeoutHandle));

    next();
  }
}
