import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt.guard';
import { RoleGuard } from './role.guard';
import { AuthService } from '../../modules/user/services/auth.service';
import { Types } from 'mongoose';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      validateJwt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
  });

  describe('canActivate', () => {
    it('should allow request with valid JWT token', async () => {
      const mockPayload = {
        userId: new Types.ObjectId().toString(),
        tenantId: new Types.ObjectId().toString(),
        email: 'test@example.com',
        roleId: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      mockAuthService.validateJwt.mockResolvedValueOnce(mockPayload);

      const mockRequest = {
        headers: { authorization: 'Bearer valid-token' },
        user: undefined,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException if Authorization header is missing', async () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid header format', async () => {
      const mockRequest = {
        headers: { authorization: 'InvalidFormat token' },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockAuthService.validateJwt.mockRejectedValueOnce(new Error('Invalid token'));

      const mockRequest = {
        headers: { authorization: 'Bearer invalid-token' },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let mockAuthService: any;
  let mockReflector: any;

  beforeEach(async () => {
    mockAuthService = {};
    mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RoleGuard>(RoleGuard);
  });

  describe('canActivate', () => {
    it('should allow access if user has required role (single role)', async () => {
      const mockUser = { userId: 'user-id', roleId: 'admin' };
      mockReflector.get.mockReturnValueOnce('admin');

      const mockRequest = { user: mockUser };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access if user role matches one of multiple required roles', async () => {
      const mockUser = { userId: 'user-id', roleId: 'editor' };
      mockReflector.get.mockReturnValueOnce(['admin', 'editor']);

      const mockRequest = { user: mockUser };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access if user does not have required role', async () => {
      const mockUser = { userId: 'user-id', roleId: 'viewer' };
      mockReflector.get.mockReturnValueOnce('admin');

      const mockRequest = { user: mockUser };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if no role requirement is set', async () => {
      const mockUser = { userId: 'user-id', roleId: 'viewer' };
      mockReflector.get.mockReturnValueOnce(undefined); // No role requirement

      const mockRequest = { user: mockUser };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user context is missing', async () => {
      const mockRequest = { user: undefined };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });
});
