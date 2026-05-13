import { NextFunction, Request, Response } from 'express';
import { Logger } from '../logger';

export function errorHandlingMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'Unhandled middleware error';

  Logger.error('Express middleware error', {
    method: req.method,
    path: req.originalUrl,
    message,
  });

  if (!res.headersSent) {
    res.status(500).json({
      statusCode: 500,
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
