import { Controller, Post, Get, Body, UseGuards, HttpCode, Request } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './services/auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

@Controller('auth')
export class UserController {
  constructor(private readonly authService: AuthService) {}

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
}
