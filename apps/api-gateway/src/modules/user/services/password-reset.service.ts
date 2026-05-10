import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetToken, PasswordResetTokenDocument } from '../schemas/password-reset-token.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { EmailService } from '../../../common/email';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private resetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) {}

  /**
   * Generate password reset token and send email
   */
  async generateResetToken(email: string, baseUrl: string): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists
      return;
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Save token with 24h expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.resetTokenModel.create({
      email,
      token: tokenHash,
      expiresAt,
      userId: user._id,
    });

    // Send email with reset link
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(email, resetLink, user.email);
  }

  /**
   * Verify reset token and update password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find token
    const resetToken = await this.resetTokenModel.findOne({
      token: tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    // Find user
    const user = await this.userModel.findById(resetToken.userId);
    if (!user) {
      throw new BadRequestException('Người dùng không tìm thấy');
    }

    // Update password (using bcrypt)
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(user._id, {
      passwordHash,
    });

    // Mark token as used
    await this.resetTokenModel.findByIdAndUpdate(resetToken._id, {
      used: true,
      usedAt: new Date(),
    });

    // Send confirmation email
    await this.emailService.sendPasswordResetSuccessEmail(user.email);
  }

  /**
   * Verify if token is still valid
   */
  async verifyToken(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.resetTokenModel.findOne({
      token: tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    return !!resetToken;
  }

  /**
   * Clean up expired/used tokens (called by scheduled job or manually)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.resetTokenModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { used: true, usedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7 days old
      ],
    });
  }
}
