import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.ADMIN_API_KEY || process.env.API_KEY;

    if (!expectedKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-admin-api-key'];

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException('Missing or invalid x-admin-api-key header');
    }

    return true;
  }
}
