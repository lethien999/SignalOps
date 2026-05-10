import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TwoFactorService } from './two-factor.service';
import { User } from '../schemas/user.schema';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  describe('generateTotpSecret', () => {
    it('should generate secret and QR code URL', () => {
      const result = service.generateTotpSecret('test@example.com');

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.qrCodeUrl).toContain('test@example.com');
    });
  });

  describe('verifyTotpCode', () => {
    it('should return true for valid 6-digit code', () => {
      const result = service.verifyTotpCode('somesecret', '123456');
      expect(result).toBe(true);
    });

    it('should return false for invalid code format', () => {
      const result = service.verifyTotpCode('somesecret', '12345');
      expect(result).toBe(false);

      const result2 = service.verifyTotpCode('somesecret', 'abcdef');
      expect(result2).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate specified number of backup codes', () => {
      const codes = service.generateBackupCodes(10);

      expect(codes).toHaveLength(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });
  });

  describe('enableTotp', () => {
    it('should enable TOTP and return backup codes', async () => {
      const userId = 'user123';
      const secret = 'mysecret';
      const code = '123456';

      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        _id: userId,
        totpEnabled: true,
      });

      const backupCodes = await service.enableTotp(userId, secret, code);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          totpSecret: secret,
          totpEnabled: true,
        }),
      );
      expect(backupCodes).toHaveLength(10);
    });

    it('should throw error for invalid OTP code', async () => {
      const userId = 'user123';
      const secret = 'mysecret';
      const invalidCode = '12345'; // Only 5 digits

      await expect(
        service.enableTotp(userId, secret, invalidCode),
      ).rejects.toThrow('Mã OTP không hợp lệ');
    });
  });

  describe('disableTotp', () => {
    it('should disable TOTP for user', async () => {
      const userId = 'user123';

      mockUserModel.findByIdAndUpdate.mockResolvedValue({
        _id: userId,
        totpEnabled: false,
      });

      await service.disableTotp(userId);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        totpSecret: null,
        backupCodes: [],
        totpEnabled: false,
      });
    });
  });
});
