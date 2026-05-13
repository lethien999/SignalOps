import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Logger } from '../../../common/logger';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async addUserToTenant(
    tenantId: Types.ObjectId,
    email: string,
    roleId: string = 'viewer'
  ): Promise<UserDocument> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({ email: email.toLowerCase(), tenantId });
    if (existingUser) {
      throw new BadRequestException('User already exists in this tenant');
    }

    // Note: user must sign up first; this method is for changing tenant access
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new NotFoundException('User not found; please ask them to sign up first');
    }

    // Update user's tenant and role
    user.tenantId = tenantId;
    user.roleId = roleId;
    await user.save();

    Logger.info('User added to tenant', { email, tenantId: tenantId.toString(), roleId });

    return user;
  }

  async removeUserFromTenant(tenantId: Types.ObjectId, userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || user.tenantId.toString() !== tenantId.toString()) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Mark user as inactive instead of deleting (soft delete)
    user.isActive = false;
    await user.save();

    Logger.info('User removed from tenant', {
      userId: userId.toString(),
      tenantId: tenantId.toString(),
    });
  }

  async updateUserRole(
    tenantId: Types.ObjectId,
    userId: Types.ObjectId,
    roleId: string
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user || user.tenantId.toString() !== tenantId.toString()) {
      throw new NotFoundException('User not found in this tenant');
    }

    if (!['admin', 'editor', 'viewer'].includes(roleId)) {
      throw new BadRequestException('Invalid role');
    }

    user.roleId = roleId;
    await user.save();

    Logger.info('User role updated', {
      userId: userId.toString(),
      tenantId: tenantId.toString(),
      roleId,
    });

    return user;
  }

  async listTenantUsers(
    tenantId: Types.ObjectId,
    skip = 0,
    limit = 50
  ): Promise<{ data: UserDocument[]; total: number }> {
    const data = await this.userModel
      .find({ tenantId, isActive: true })
      .skip(skip)
      .limit(limit)
      .select('-passwordHash')
      .lean();

    const total = await this.userModel.countDocuments({ tenantId, isActive: true });

    return { data: data as any, total };
  }

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async getUserById(userId: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(userId).select('-passwordHash');
  }
}
