import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';

/**
 * Simple TOTP implementation for demo purposes
 * In production, use 'speakeasy' or 'otplib' library
 */
@Injectable()
export class TwoFactorService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * Generate TOTP secret and QR code URL
   */
  generateTotpSecret(email: string): {
    secret: string;
    qrCodeUrl: string;
  } {
    // In production: use speakeasy.generateSecret()
    // For now, generate a mock secret (32 bytes, base32 encoded)
    const secret = crypto.randomBytes(32).toString('base64').slice(0, 32);

    // Generate QR code URL (for Google Authenticator, use proper library in production)
    const qrCodeUrl = `otpauth://totp/SignalOps:${email}?secret=${secret}&issuer=SignalOps`;

    return { secret, qrCodeUrl };
  }

  /**
   * Verify TOTP code
   */
  verifyTotpCode(secret: string, code: string): boolean {
    // In production: use speakeasy.totp.verify()
    // For demo: simple 6-digit code validation
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    // Mock verification: for demo, any 6-digit code is valid
    // In production, verify against HMAC-SHA1 time-window
    return true;
  }

  /**
   * Generate backup codes (one-time use recovery codes)
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  /**
   * Enable TOTP for user
   */
  async enableTotp(
    userId: string,
    secret: string,
    code: string,
  ): Promise<string[]> {
    if (!this.verifyTotpCode(secret, code)) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

    await this.userModel.findByIdAndUpdate(userId, {
      totpSecret: secret,
      backupCodes: hashedBackupCodes,
      totpEnabled: true,
    });

    return backupCodes; // Return plain codes once (user must save them)
  }

  /**
   * Disable TOTP for user
   */
  async disableTotp(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      totpSecret: null,
      backupCodes: [],
      totpEnabled: false,
    });
  }

  /**
   * Verify login with TOTP
   */
  async verifyLoginTotp(
    userId: string,
    code: string,
    backupCodes?: string[],
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return false;
    }

    // Try regular TOTP code
    if (this.verifyTotpCode(user.totpSecret, code)) {
      return true;
    }

    // Try backup codes if provided
    if (backupCodes) {
      for (const backupCode of user.backupCodes) {
        const isMatch = await bcrypt.compare(backupCodes[0], backupCode);
        if (isMatch) {
          // Mark backup code as used (optional: remove it)
          return true;
        }
      }
    }

    return false;
  }
}
