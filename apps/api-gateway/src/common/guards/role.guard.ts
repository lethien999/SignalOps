import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/user/services/auth.service';
import { AUTHORIZE_KEY } from '../decorators/authorize.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtGuard

    if (!user) {
      throw new ForbiddenException('User context not found (missing JWT?)');
    }

    // Get required role from decorator
    const requiredRole = this.reflector.get<string | string[]>(AUTHORIZE_KEY, context.getHandler());

    // No role requirement means accessible to any authenticated user
    if (!requiredRole) {
      return true;
    }

    // Check if user role matches required role
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.roleId)) {
      throw new ForbiddenException(`Insufficient permissions. Required role: ${roles.join(' or ')}`);
    }

    return true;
  }
}
