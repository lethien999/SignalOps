import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../schemas/password-reset-token.schema';
import { User } from '../schemas/user.schema';
import { EmailService } from '../../../common/email';
import * as crypto from 'crypto';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let mockResetTokenModel: any;
  let mockUserModel: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockResetTokenModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteMany: jest.fn(),
    };

    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
      sendPasswordResetSuccessEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getModelToken(PasswordResetToken.name),
          useValue: mockResetTokenModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('generateResetToken', () => {
    it('should generate token and send email for valid user', async () => {
      const email = 'test@example.com';
      const userId = 'user123';
      const baseUrl = 'http://localhost:3000';

      mockUserModel.findOne.mockResolvedValue({
        _id: userId,
        email,
      });

      mockResetTokenModel.create.mockResolvedValue({
        email,
        token: 'hash',
      });

      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.generateResetToken(email, baseUrl);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
      expect(mockResetTokenModel.create).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should silently return for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';
      mockUserModel.findOne.mockResolvedValue(null);

      await service.generateResetToken(email, 'http://localhost:3000');

      expect(mockResetTokenModel.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'plaintext-token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
      const newPassword = 'newsecurepass123';
      const userId = 'user123';

      mockResetTokenModel.findOne.mockResolvedValue({
        _id: 'token123',
        token: tokenHash,
        userId,
      });

      mockUserModel.findById.mockResolvedValue({
        _id: userId,
        email: 'test@example.com',
      });

      mockUserModel.findByIdAndUpdate.mockResolvedValue({});
      mockResetTokenModel.findByIdAndUpdate.mockResolvedValue({});
      mockEmailService.sendPasswordResetSuccessEmail.mockResolvedValue(
        undefined,
      );

      await service.resetPassword(token, newPassword);

      expect(mockResetTokenModel.findOne).toHaveBeenCalled();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockResetTokenModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      mockResetTokenModel.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword(token, 'newpass123'),
      ).rejects.toThrow('Token không hợp lệ hoặc đã hết hạn');
    });

    it('should throw error for short password', async () => {
      const token = 'valid-token';
      const shortPassword = 'short';

      await expect(
        service.resetPassword(token, shortPassword),
      ).rejects.toThrow('Mật khẩu phải có ít nhất 8 ký tự');
    });
  });

  describe('verifyToken', () => {
    it('should return true for valid token', async () => {
      const token = 'valid-token';
      mockResetTokenModel.findOne.mockResolvedValue({ _id: 'token123' });

      const result = await service.verifyToken(token);

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const token = 'invalid-token';
      mockResetTokenModel.findOne.mockResolvedValue(null);

      const result = await service.verifyToken(token);

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired and old used tokens', async () => {
      mockResetTokenModel.deleteMany.mockResolvedValue({
        deletedCount: 5,
      });

      await service.cleanupExpiredTokens();

      expect(mockResetTokenModel.deleteMany).toHaveBeenCalled();
    });
  });
});
