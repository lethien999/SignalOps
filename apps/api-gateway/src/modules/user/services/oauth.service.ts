import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class OAuthService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Find existing user or create new one via OAuth
   * Flow:
   *  1. Check if provider+providerId already linked → return user
   *  2. Check if email exists → link provider + return user
   *  3. Create new user + link provider + auto-create tenant → return user
   */
  async findOrCreateUserViaOAuth(
    provider: string,
    providerId: string,
    email: string
  ): Promise<UserDocument> {
    // Validate inputs
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }

    if (!providerId || !email) {
      throw new BadRequestException('Provider ID and email are required');
    }

    // Step 1: Check if this provider+providerId is already linked
    let user = await this.userModel.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    });

    if (user) {
      return user;
    }

    // Step 2: Check if email already exists
    user = await this.userModel.findOne({ email: email.toLowerCase() });

    if (user) {
      // Check if this provider is not already linked to this user
      const isProviderLinked = user.oauthProviders.some((p) => p.provider === provider);
      if (isProviderLinked) {
        throw new ConflictException(`${provider} is already linked to this account`);
      }

      // Link this provider to existing user
      await this.linkOAuthProvider(user._id as Types.ObjectId, provider, providerId, email);
      const refreshedUser = await this.userModel.findById(user._id);
      if (!refreshedUser) {
        throw new BadRequestException('User not found after linking OAuth provider');
      }

      return refreshedUser;
    }

    // Step 3: Create new user with OAuth provider
    // Generate a secure random password (user won't use it, but field is required)
    const generatedPassword = this.generateSecurePassword();

    const newUser = new this.userModel({
      email: email.toLowerCase(),
      passwordHash: generatedPassword, // Will be hashed by pre-save hook
      oauthProviders: [
        {
          provider,
          providerId,
          email,
          linkedAt: new Date(),
        },
      ],
      roleId: 'viewer', // Default role
      isActive: true,
    });

    const savedUser = await newUser.save();

    // Auto-create tenant for this user (similar to signup flow)
    // TODO: Implement tenant auto-creation if needed
    // For now, user should manually set tenantId or join via invite

    return savedUser;
  }

  /**
   * Link OAuth provider to existing user
   * Validates:
   *  - Provider not already linked to this user
   *  - Provider+providerId not linked to another user
   */
  async linkOAuthProvider(
    userId: Types.ObjectId,
    provider: string,
    providerId: string,
    email: string
  ): Promise<UserDocument> {
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }

    // Check if this provider+providerId is already linked to another user
    const existingLink = await this.userModel.findOne({
      _id: { $ne: userId },
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': providerId,
    });

    if (existingLink) {
      throw new ConflictException(
        `This ${provider} account is already linked to another user. Please unlink it first.`
      );
    }

    // Link provider
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $push: {
          oauthProviders: {
            provider,
            providerId,
            email,
            linkedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  /**
   * Unlink OAuth provider from user
   * Validates:
   *  - User must have at least one auth method (email+password OR 2+ providers)
   */
  async unlinkOAuthProvider(userId: Types.ObjectId, provider: string): Promise<UserDocument> {
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if user has other auth methods
    const remainingProviders = user.oauthProviders.filter((p) => p.provider !== provider);
    const hasPasswordAuth = !!user.passwordHash;

    // User must have:
    //  - (email + password) OR
    //  - 2+ OAuth providers
    const hasOtherAuthMethod =
      (hasPasswordAuth && remainingProviders.length >= 0) || remainingProviders.length >= 1;

    if (!hasOtherAuthMethod) {
      throw new BadRequestException(
        'Cannot unlink your only authentication method. Please set a password or link another provider first.'
      );
    }

    // Remove provider
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $pull: {
          oauthProviders: { provider },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    return updatedUser;
  }

  /**
   * Get all linked OAuth providers for a user
   */
  async getLinkedProviders(
    userId: Types.ObjectId
  ): Promise<Array<{ provider: string; email: string; linkedAt: Date }>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.oauthProviders.map((p) => ({
      provider: p.provider,
      email: p.email,
      linkedAt: p.linkedAt,
    }));
  }

  /**
   * Generate a secure random password for OAuth-created users
   */
  private generateSecurePassword(): string {
    const length = 32;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
