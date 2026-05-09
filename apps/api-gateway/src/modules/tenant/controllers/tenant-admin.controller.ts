import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { Authorize } from '../../../common/decorators/authorize.decorator';
import { UserService } from '../../user/services/user.service';
import { validateTenantAccess } from '../../../common/utils/tenant-filter.util';

@Controller('tenants/:tenantId/users')
@UseGuards(JwtGuard, RoleGuard)
export class TenantAdminController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /tenants/:tenantId/users
   * List all users in a tenant (admin only)
   */
  @Get()
  @Authorize('admin')
  @HttpCode(200)
  async listUsers(
    @Param('tenantId') tenantId: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '50',
    @Request() req: any,
  ) {
    // Verify requester belongs to this tenant
    if (!validateTenantAccess(req.user.tenantId, tenantId)) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    const skipNum = Math.max(0, parseInt(skip, 10) || 0);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    return this.userService.listTenantUsers(new Types.ObjectId(tenantId), skipNum, limitNum);
  }

  /**
   * POST /tenants/:tenantId/users
   * Add a user to tenant (admin only)
   */
  @Post()
  @Authorize('admin')
  @HttpCode(201)
  async addUser(
    @Param('tenantId') tenantId: string,
    @Body() dto: { email: string; roleId?: string },
    @Request() req: any,
  ) {
    // Verify requester belongs to this tenant
    if (!validateTenantAccess(req.user.tenantId, tenantId)) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    const roleId = dto.roleId || 'viewer';
    if (!['admin', 'editor', 'viewer'].includes(roleId)) {
      throw new BadRequestException('Invalid roleId. Must be admin, editor, or viewer');
    }

    return this.userService.addUserToTenant(new Types.ObjectId(tenantId), dto.email, roleId);
  }

  /**
   * DELETE /tenants/:tenantId/users/:userId
   * Remove user from tenant (admin only)
   */
  @Delete(':userId')
  @Authorize('admin')
  @HttpCode(200)
  async removeUser(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    // Verify requester belongs to this tenant
    if (!validateTenantAccess(req.user.tenantId, tenantId)) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.userService.removeUserFromTenant(
      new Types.ObjectId(tenantId),
      new Types.ObjectId(userId),
    );
  }

  /**
   * PATCH /tenants/:tenantId/users/:userId/role
   * Update user role (admin only)
   */
  @Patch(':userId/role')
  @Authorize('admin')
  @HttpCode(200)
  async updateUserRole(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: { roleId: string },
    @Request() req: any,
  ) {
    // Verify requester belongs to this tenant
    if (!validateTenantAccess(req.user.tenantId, tenantId)) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (!dto.roleId) {
      throw new BadRequestException('roleId is required');
    }

    if (!['admin', 'editor', 'viewer'].includes(dto.roleId)) {
      throw new BadRequestException('Invalid roleId. Must be admin, editor, or viewer');
    }

    return this.userService.updateUserRole(
      new Types.ObjectId(tenantId),
      new Types.ObjectId(userId),
      dto.roleId,
    );
  }
}
