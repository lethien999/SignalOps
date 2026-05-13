import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from '../logger';

@Injectable()
export class RequestResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    Logger.info('Incoming request', {
      method: request.method,
      path: request.originalUrl || request.url,
      requestId: request.headers['x-request-id'] || null,
    });

    return next.handle().pipe(
      tap(() => {
        Logger.info('Outgoing response', {
          method: request.method,
          path: request.originalUrl || request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - now,
        });
      })
    );
  }
}
