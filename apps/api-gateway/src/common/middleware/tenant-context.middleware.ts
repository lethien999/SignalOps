import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../modules/user/services/auth.service';

/**
 * Middleware to extract tenant context from JWT token
 * Attaches tenant info to request for use in services
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      try {
        // Extract token from "Bearer <token>"
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          const token = parts[1];
          const payload = await this.authService.validateJwt(token);

          // Attach tenant context to request
          (req as any).tenantId = payload.tenantId;
          (req as any).userId = payload.userId;
          (req as any).roleId = payload.roleId;
        }
      } catch {
        // Ignore JWT validation errors here; JwtGuard will handle authorization
        // This middleware is just for context enrichment
      }
    }

    next();
  }
}
