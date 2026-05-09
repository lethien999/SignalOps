import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User, UserDocument } from '../schemas/user.schema';
import { Role, RoleDocument } from '../schemas/role.schema';
import { Logger } from '../../../common/logger';

const BCRYPT_ROUNDS = 12;

export type JwtPayload = {
  userId: string;
  tenantId: string;
  email: string;
  roleId: string;
  iat: number;
  exp: number;
};

export type LoginResult = {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roleId: string;
  };
};

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
  private readonly jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async signup(email: string, password: string, tenantId: Types.ObjectId): Promise<LoginResult> {
    // Validate email & password
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user with admin role (first user in tenant)
    const user = await this.userModel.create({
      email: email.toLowerCase(),
      passwordHash,
      tenantId,
      roleId: 'admin', // auto-assign admin for signup
      isActive: true,
    });

    Logger.info('User signed up', { email: user.email, userId: user._id.toString(), tenantId: tenantId.toString() });

    return this.buildLoginResult(user);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    // Find user by email
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).lean();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Update lastLoginAt
    await this.userModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    Logger.info('User logged in', { email: user.email, userId: user._id.toString() });

    return this.buildLoginResult(user as any);
  }

  async validateJwt(token: string): Promise<JwtPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async checkPermission(userId: Types.ObjectId | string, permission: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }

    const role = await this.roleModel.findById(user.roleId);
    if (!role) {
      return false;
    }

    return role.permissions.includes(permission);
  }

  async checkPermissions(userId: Types.ObjectId | string, permissions: string[]): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }

    const role = await this.roleModel.findById(user.roleId);
    if (!role) {
      return false;
    }

    return permissions.some((p) => role.permissions.includes(p));
  }

  async getUserById(userId: Types.ObjectId | string) {
    return this.userModel.findById(userId).lean();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  private buildLoginResult(user: any): LoginResult {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      roleId: user.roleId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn as any });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        tenantId: user.tenantId.toString(),
        roleId: user.roleId,
      },
    };
  }
}
