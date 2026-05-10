import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OAuthService } from './oauth.service';
import { User } from '../schemas/user.schema';
import { UserService } from './user.service';

describe('OAuthService', () => {
  let service: OAuthService;
  let mockUserModel: any;
  let mockUserService: any;
  const userId = new Types.ObjectId();

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
      prototype: { save: jest.fn() },
    };

    mockUserService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
  });

  describe('findOrCreateUserViaOAuth', () => {
    it('should return existing user if provider+providerId already linked', async () => {
      const existingUser = {
        _id: userId,
        email: 'user@example.com',
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      };

      mockUserModel.findOne.mockResolvedValueOnce(existingUser);

      const result = await service.findOrCreateUserViaOAuth('google', '123', 'user@example.com');

      expect(result).toEqual(existingUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        'oauthProviders.provider': 'google',
        'oauthProviders.providerId': '123',
      });
    });

    it('should link provider to existing user by email', async () => {
      const existingUser = {
        _id: userId,
        email: 'user@example.com',
        oauthProviders: [],
      };

      mockUserModel.findOne
        .mockResolvedValueOnce(null) // First check for provider+providerId
        .mockResolvedValueOnce(existingUser); // Check for email
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        ...existingUser,
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      });
      mockUserModel.findById.mockResolvedValueOnce({
        ...existingUser,
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      });

      const result = await service.findOrCreateUserViaOAuth(
        'google',
        '123',
        'user@example.com',
        'John Doe',
      );

      expect(result.oauthProviders).toHaveLength(1);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should create new user with OAuth provider', async () => {
      mockUserModel.findOne
        .mockResolvedValueOnce(null) // First check for provider+providerId
        .mockResolvedValueOnce(null); // Check for email

      const newUserInstance = {
        _id: new Types.ObjectId(),
        email: 'newuser@example.com',
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'newuser@example.com' }],
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          email: 'newuser@example.com',
          oauthProviders: [
            { provider: 'google', providerId: '123', email: 'newuser@example.com' },
          ],
        }),
      };

      mockUserModel.mockImplementation(() => newUserInstance);

      const result = await service.findOrCreateUserViaOAuth(
        'google',
        '123',
        'newuser@example.com',
        'New User',
      );

      expect(result.email).toBe('newuser@example.com');
      expect(result.oauthProviders).toHaveLength(1);
      expect(newUserInstance.save).toHaveBeenCalled();
    });

    it('should throw error for invalid provider', async () => {
      await expect(
        service.findOrCreateUserViaOAuth('invalid', '123', 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if providerId is missing', async () => {
      await expect(service.findOrCreateUserViaOAuth('google', '', 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if provider already linked to this user', async () => {
      const existingUser = {
        _id: userId,
        email: 'user@example.com',
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      };

      mockUserModel.findOne
        .mockResolvedValueOnce(null) // First check for provider+providerId
        .mockResolvedValueOnce(existingUser); // Check for email

      await expect(
        service.findOrCreateUserViaOAuth('google', '456', 'user@example.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('linkOAuthProvider', () => {
    it('should link OAuth provider to user', async () => {
      const user = {
        _id: userId,
        oauthProviders: [],
      };

      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        ...user,
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      });

      const result = await service.linkOAuthProvider(userId, 'google', '123', 'user@example.com');

      expect(result.oauthProviders).toHaveLength(1);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          $push: expect.objectContaining({
            oauthProviders: expect.objectContaining({
              provider: 'google',
              providerId: '123',
            }),
          }),
        }),
        { new: true },
      );
    });

    it('should throw error if provider already linked to another user', async () => {
      const anotherUser = {
        _id: new Types.ObjectId(),
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'other@example.com' }],
      };

      mockUserModel.findOne.mockResolvedValueOnce(anotherUser);

      await expect(
        service.linkOAuthProvider(userId, 'google', '123', 'user@example.com'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw error for invalid provider', async () => {
      await expect(
        service.linkOAuthProvider(userId, 'invalid', '123', 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user not found', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null); // No existing link
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce(null); // User not found

      await expect(
        service.linkOAuthProvider(userId, 'google', '123', 'user@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlinkOAuthProvider', () => {
    it('should unlink OAuth provider from user with multiple providers', async () => {
      const user = {
        _id: userId,
        passwordHash: 'hash',
        oauthProviders: [
          { provider: 'google', providerId: '123', email: 'user@example.com' },
          { provider: 'github', providerId: '456', email: 'user@example.com' },
        ],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        ...user,
        oauthProviders: [{ provider: 'github', providerId: '456', email: 'user@example.com' }],
      });

      const result = await service.unlinkOAuthProvider(userId, 'google');

      expect(result.oauthProviders).toHaveLength(1);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          $pull: { oauthProviders: { provider: 'google' } },
        }),
        { new: true },
      );
    });

    it('should unlink OAuth provider from user with password', async () => {
      const user = {
        _id: userId,
        passwordHash: 'hash',
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        ...user,
        oauthProviders: [],
      });

      const result = await service.unlinkOAuthProvider(userId, 'google');

      expect(result.oauthProviders).toHaveLength(0);
    });

    it('should throw error if unlinking only auth method', async () => {
      const user = {
        _id: userId,
        passwordHash: null,
        oauthProviders: [{ provider: 'google', providerId: '123', email: 'user@example.com' }],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);

      await expect(service.unlinkOAuthProvider(userId, 'google')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid provider', async () => {
      const user = {
        _id: userId,
        passwordHash: 'hash',
        oauthProviders: [],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);

      await expect(service.unlinkOAuthProvider(userId, 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user not found', async () => {
      mockUserModel.findById.mockResolvedValueOnce(null);

      await expect(service.unlinkOAuthProvider(userId, 'google')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLinkedProviders', () => {
    it('should return list of linked providers', async () => {
      const user = {
        _id: userId,
        oauthProviders: [
          {
            provider: 'google',
            email: 'user@example.com',
            linkedAt: new Date('2026-05-10'),
          },
          {
            provider: 'github',
            email: 'user@example.com',
            linkedAt: new Date('2026-05-11'),
          },
        ],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);

      const result = await service.getLinkedProviders(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        provider: 'google',
        email: 'user@example.com',
        linkedAt: new Date('2026-05-10'),
      });
    });

    it('should return empty array if no providers linked', async () => {
      const user = {
        _id: userId,
        oauthProviders: [],
      };

      mockUserModel.findById.mockResolvedValueOnce(user);

      const result = await service.getLinkedProviders(userId);

      expect(result).toHaveLength(0);
    });

    it('should throw error if user not found', async () => {
      mockUserModel.findById.mockResolvedValueOnce(null);

      await expect(service.getLinkedProviders(userId)).rejects.toThrow(BadRequestException);
    });
  });
});
