import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { GoogleAuthGuard } from './google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  @ApiResponse({ status: 302, description: 'Redirect to Google' })
  googleAuth() {
    // Guard handles the redirect — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback — issues JWT cookie and redirects to app',
  })
  async googleAuthRedirect(
    @Req() req: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const user = (req as any).user as {
      email: string;
      firstName: string;
      picture?: string;
    };
    const token = this.jwtService.sign({
      email: user.email,
      name: user.firstName,
      picture: user.picture,
    });
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // seconds (not ms) for Fastify
      path: '/',
    });

    reply.status(302).redirect(frontendUrl);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Returns the authenticated user profile from the JWT cookie',
  })
  @ApiResponse({ status: 200, description: 'Authenticated user info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  status(@Req() req: FastifyRequest) {
    return (req as any).user;
  }

  @Get('logout')
  @ApiOperation({ summary: 'Clear the auth cookie and redirect to the app' })
  logout(@Res({ passthrough: false }) reply: FastifyReply) {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    reply.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    reply.status(302).redirect(frontendUrl);
  }
}
