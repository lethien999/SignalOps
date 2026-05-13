import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { User } from '../schemas/user.schema';
import { Role } from '../schemas/role.schema';
import { Types } from 'mongoose';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockRoleModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    mockRoleModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Role.name),
          useValue: mockRoleModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('should create a new user with admin role', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const tenantId = new Types.ObjectId();

      const mockUser = {
        _id: new Types.ObjectId(),
        email,
        tenantId,
        roleId: 'admin',
      };

      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockResolvedValueOnce(mockUser);

      const result = await service.signup(email, password, tenantId);

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.roleId).toBe('admin');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: email.toLowerCase() });
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const tenantId = new Types.ObjectId();

      mockUserModel.findOne.mockResolvedValueOnce({ email });

      await expect(service.signup(email, password, tenantId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid email', async () => {
      const email = 'invalid-email';
      const password = 'password123';
      const tenantId = new Types.ObjectId();

      await expect(service.signup(email, password, tenantId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error for weak password', async () => {
      const email = 'test@example.com';
      const password = 'short';
      const tenantId = new Types.ObjectId();

      await expect(service.signup(email, password, tenantId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return token and user on successful login', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 12);

      const mockUser = {
        _id: new Types.ObjectId(),
        email,
        passwordHash: hashedPassword,
        tenantId: new Types.ObjectId(),
        roleId: 'editor',
        isActive: true,
        save: jest.fn(),
      };

      mockUserModel.findOne.mockResolvedValueOnce(mockUser);
      mockUserModel.updateOne.mockResolvedValueOnce({});

      const result = await service.login(email, password);

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.roleId).toBe('editor');
    });

    it('should throw error for invalid email', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);

      await expect(service.login('notfound@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error for wrong password', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash('correctpassword', 12);

      const mockUser = {
        _id: new Types.ObjectId(),
        email,
        passwordHash: hashedPassword,
        tenantId: new Types.ObjectId(),
        roleId: 'viewer',
        isActive: true,
      };

      mockUserModel.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.login(email, wrongPassword)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for inactive user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 12);

      const mockUser = {
        _id: new Types.ObjectId(),
        email,
        passwordHash: hashedPassword,
        tenantId: new Types.ObjectId(),
        roleId: 'viewer',
        isActive: false,
      };

      mockUserModel.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateJwt', () => {
    it('should validate a valid JWT token', async () => {
      const payload = {
        userId: new Types.ObjectId().toString(),
        tenantId: new Types.ObjectId().toString(),
        email: 'test@example.com',
        roleId: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      // Manually create a token for testing (use the same secret)
      const token = jwt.sign(payload, 'dev-secret-key-change-in-prod');

      const result = await service.validateJwt(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
    });

    it('should throw error for invalid token', async () => {
      await expect(service.validateJwt('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('checkPermission', () => {
    it('should return true if user has permission', async () => {
      const userId = new Types.ObjectId();
      const mockUser = { _id: userId, roleId: 'admin' };
      const mockRole = {
        _id: 'admin',
        permissions: ['read:events', 'write:events', 'manage:users'],
      };

      mockUserModel.findById.mockResolvedValueOnce(mockUser);
      mockRoleModel.findById.mockResolvedValueOnce(mockRole);

      const result = await service.checkPermission(userId, 'manage:users');

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      const userId = new Types.ObjectId();
      const mockUser = { _id: userId, roleId: 'viewer' };
      const mockRole = { _id: 'viewer', permissions: ['read:events', 'read:alerts'] };

      mockUserModel.findById.mockResolvedValueOnce(mockUser);
      mockRoleModel.findById.mockResolvedValueOnce(mockRole);

      const result = await service.checkPermission(userId, 'manage:users');

      expect(result).toBe(false);
    });
  });
});
