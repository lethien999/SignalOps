import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from '../logger';

/**
 * API Key Guard — bảo vệ endpoint ingestion.
 * Nếu biến `API_KEY` được đặt, mọi request POST /api/events phải kèm header `x-api-key`.
 * Nếu `API_KEY` không được đặt, guard cho phép tất cả (development mode).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const apiKey = process.env.API_KEY;

    // Không cấu hình API key → cho phép tất cả (dev mode)
    if (!apiKey) return true;

    const request = context.switchToHttp().getRequest();

    // Chỉ kiểm tra POST requests
    if (request.method !== 'POST') return true;

    const providedKey = request.headers['x-api-key'];

    if (!providedKey || providedKey !== apiKey) {
      Logger.warn('API key không hợp lệ hoặc thiếu', {
        ip: request.ip,
        path: request.path,
      });
      throw new HttpException(
        { statusCode: HttpStatus.UNAUTHORIZED, message: 'API key không hợp lệ hoặc thiếu. Gửi header x-api-key.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }
}
