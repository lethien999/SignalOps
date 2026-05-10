import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Param,
  BadRequestException,
  HttpCode,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Types } from 'mongoose';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { OAuthService } from '../user/services/oauth.service';
import { AuthService } from '../user/services/auth.service';
import { Disable2FaDto } from '../user/dtos/verify-2fa.dto';

@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private authService: AuthService,
  ) {}

  /**
   * GET /auth/oauth/:provider
   * Redirect to OAuth provider login
   */
  @Get(':provider')
  async startOAuth(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }
    res.redirect(`/oauth/${provider}`);
  }

  /**
   * GET /auth/oauth/:provider/callback
   * Handle OAuth callback from provider
   */
  @Get(':provider/callback')
  @UseGuards(AuthGuard('google'))
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): Promise<void> {
    res.redirect('/login');
  }

  /**
   * POST /auth/oauth/link/:provider
   * Start linking OAuth provider (protected)
   */
  @Post('link/:provider')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async startLinking(
    @Param('provider') provider: string,
  ): Promise<{ message: string }> {
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }
    return { message: 'OAuth linking initiated' };
  }

  /**
   * POST /auth/oauth/:provider/unlink
   * Unlink OAuth provider (protected)
   */
  @Post(':provider/unlink')
  @UseGuards(JwtGuard)
  @HttpCode(200)
  async unlinkProvider(
    @Param('provider') provider: string,
    @Body() dto: Disable2FaDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    if (!['google', 'github'].includes(provider)) {
      throw new BadRequestException('Invalid OAuth provider');
    }

    const userId = new Types.ObjectId(req.user.userId);

    // Verify password
    const userDoc = await this.authService.getUserById(userId);
    const isPasswordValid = await this.authService.validatePassword(dto.password, userDoc.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException('Password is incorrect');
    }

    // Unlink provider
    await this.oauthService.unlinkOAuthProvider(userId, provider);

    return { message: `${provider} account unlinked successfully` };
  }
}
