import { Controller, Post, Get, Body, UseGuards, HttpCode, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './services/auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

@Controller('auth')
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
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
}
