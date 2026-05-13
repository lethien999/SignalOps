import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';
import { Logger } from '../../../common/logger';

/**
 * Tenant Quota Middleware
 * Extracts API key from request headers, resolves tenant, and attaches to request
 * Also enforces quota before allowing request to proceed
 */
@Injectable()
export class TenantQuotaMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip quota check for non-event ingest endpoints
    if (!req.path.includes('/api/events') && req.method !== 'POST') {
      return next();
    }

    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      // If no API key, attach null tenant and proceed
      (req as any).tenant = null;
      return next();
    }

    try {
      const tenant = await this.tenantService.getByApiKey(apiKey);
      if (!tenant || tenant.status !== 'active') {
        (req as any).tenant = null;
        return next();
      }

      (req as any).tenant = tenant;

      // For event ingest POST, check quota
      if (req.path === '/api/events' && req.method === 'POST') {
        const quotaCheck = await this.tenantService.recordEventIngest(apiKey, 1);
        if (!quotaCheck.allowed) {
          Logger.warn(`Quota exceeded for tenant ${tenant.name} on ingest`, {
            apiKey: tenant.apiKeyPreview,
          });
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Tenant quota exceeded for events. Monthly limit: ${tenant.quota.eventsPerMonth}. Current usage: ${tenant.usage.events + 1}/${tenant.quota.eventsPerMonth}`,
            },
            HttpStatus.TOO_MANY_REQUESTS
          );
        }
      }

      return next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      Logger.warn('Tenant quota middleware error; proceeding without quota check', {
        error: error instanceof Error ? error.message : String(error),
      });
      return next();
    }
  }
}
