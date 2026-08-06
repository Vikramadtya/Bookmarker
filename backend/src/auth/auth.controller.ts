import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';

import { GoogleAuthGuard } from './google-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
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
    const profile = (req as any).user as {
      email: string;
      firstName: string;
      picture?: string;
    };

    const dbUser = await this.usersService.findOrCreateUser({
      email: profile.email,
      name: profile.firstName,
      picture: profile.picture,
    });

    const token = this.jwtService.sign({
      id: dbUser._id,
      email: dbUser.email,
      username: dbUser.username,
      name: dbUser.name,
      picture: dbUser.picture,
    });
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    reply.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60, // seconds (not ms) for Fastify
      path: '/',
    });

    reply.status(302).redirect(`${frontendUrl}?token=${token}`);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Returns the authenticated user profile',
  })
  @ApiResponse({ status: 200, description: 'Authenticated user info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async status(@Req() req: FastifyRequest) {
    const userPayload = (req as any).user;
    // Fetch fresh user from DB using findOrCreateUser to ensure old users get a username generated
    const dbUser = await this.usersService.findOrCreateUser({
      email: userPayload.email,
      name: userPayload.name,
      picture: userPayload.picture,
    });

    return {
      ...userPayload,
      username: dbUser.username,
      id: dbUser._id,
    };
  }

  @Get('logout')
  @ApiOperation({ summary: 'Clear the auth cookie and redirect to the app' })
  logout(@Res({ passthrough: false }) reply: FastifyReply) {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    reply.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
    reply.status(302).redirect(frontendUrl);
  }
}
