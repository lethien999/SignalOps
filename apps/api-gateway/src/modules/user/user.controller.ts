import { Controller, Post, Get, Body, UseGuards, HttpCode, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './services/auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { TwoFactorService } from './services/two-factor.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { Enable2FaDto, Disable2FaDto } from './dtos/verify-2fa.dto';

@Controller('auth')
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * POST /auth/signup
   * Register a new user
   */
  @Post('signup')
  @HttpCode(201)
  async signup(@Body() dto: SignupDto) {
    const tenantId = new Types.ObjectId(dto.tenantId);
    return this.authService.signup(dto.email, dto.password, tenantId);
  }

  /**
   * POST /auth/login
   * Login with email and password
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * GET /auth/me
   * Get current user info (requires JWT)
   */
  @Get('me')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async me(@Request() req: any) {
    const jwtPayload = req.user;
    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email,
      tenantId: jwtPayload.tenantId,
      roleId: jwtPayload.roleId,
    };
  }

  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Request() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await this.passwordResetService.generateResetToken(dto.email, baseUrl);
    return { message: 'Nếu email tồn tại, link reset password sẽ được gửi' };
  }

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }

  /**
   * POST /auth/2fa/enable
   * Start 2FA setup (returns secret + QR code URL)
   */
  @Post('2fa/enable')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async enableTwoFa(@Request() req: any) {
    const email = req.user.email;
    const { secret, qrCodeUrl } = this.twoFactorService.generateTotpSecret(email);

    return {
      secret,
      qrCodeUrl,
      message: 'Quét mã QR bằng Google Authenticator, sau đó xác minh bằng mã OTP',
    };
  }

  /**
   * POST /auth/2fa/verify-setup
   * Verify TOTP code and finalize 2FA setup
   */
  @Post('2fa/verify-setup')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async verifyTwoFaSetup(
    @Request() req: any,
    @Body() dto: Enable2FaDto & { secret: string },
  ) {
    const userId = req.user.userId;
    const backupCodes = await this.twoFactorService.enableTotp(
      userId,
      dto.secret,
      dto.code,
    );

    return {
      message: '2FA được bật thành công',
      backupCodes,
      warning: 'Lưu các mã backup ở nơi an toàn. Bạn sẽ cần chúng nếu mất quyền truy cập Authenticator',
    };
  }

  /**
   * POST /auth/2fa/disable
   * Disable 2FA (requires password confirmation)
   */
  @Post('2fa/disable')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async disableTwoFa(@Request() req: any, @Body() dto: Disable2FaDto) {
    const userId = req.user.userId;
    const user = await this.authService.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await this.authService.validatePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new Error('Mật khẩu không chính xác');
    }

    await this.twoFactorService.disableTotp(userId);
    return { message: '2FA đã bị tắt' };
  }
}
