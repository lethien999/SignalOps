import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from '../logger';
import { ApiKeyAdminService } from '../../modules/admin/api-key-admin.service';

/**
 * API Key Guard — bảo vệ endpoint ingestion.
 * Nếu biến `API_KEY` được đặt, mọi request POST /api/events phải kèm header `x-api-key`.
 * Nếu `API_KEY` không được đặt, guard cho phép tất cả (development mode).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyAdminService: ApiKeyAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const envApiKey = process.env.API_KEY;

    const request = context.switchToHttp().getRequest();

    // Chỉ kiểm tra POST requests
    if (request.method !== 'POST') return true;

    const providedKey = request.headers['x-api-key'];

    const hasStoredKeys = await this.apiKeyAdminService.hasActiveKeys();

    // Không cấu hình API key và chưa có key trong DB → cho phép tất cả (dev mode)
    if (!envApiKey && !hasStoredKeys) return true;

    const isValidStoredKey = await this.apiKeyAdminService.validateApiKey(providedKey);
    const isValidEnvKey = providedKey === envApiKey;

    if (!providedKey || (!isValidStoredKey && !isValidEnvKey)) {
      Logger.warn('API key không hợp lệ hoặc thiếu', {
        ip: request.ip,
        path: request.path,
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'API key không hợp lệ hoặc thiếu. Gửi header x-api-key.',
        },
        HttpStatus.FORBIDDEN
      );
    }

    await this.apiKeyAdminService.markUsed(providedKey).catch(() => undefined);

    return true;
  }
}
