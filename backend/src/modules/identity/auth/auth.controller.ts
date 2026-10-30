import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { UsersService } from '@identity/users/application/services/users.service';
import {
  AUTH_COOKIE,
  authCookieOptions,
  getFrontendUrl,
} from '@core/config/app.config';
import { GoogleAuthGuard } from './google-auth.guard';
import type { AuthUser } from './jwt.strategy';

export const SOCKET_PURPOSE = 'socket';
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

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
  googleAuth() {
    // The guard performs the redirect.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary:
      'Google OAuth callback: sets the auth cookie and redirects to the app',
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
    const user = await this.usersService.findOrCreateUser({
      email: profile.email,
      name: profile.firstName,
      picture: profile.picture,
    });

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      picture: user.picture,
    });

    reply.setCookie(AUTH_COOKIE, token, {
      ...authCookieOptions(this.config),
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    reply.status(302).redirect(getFrontendUrl(this.config));
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Returns the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated user info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async status(@Req() req: FastifyRequest) {
    const { email } = (req as any).user as AuthUser;
    // A token for a deleted user must not be accepted (or silently recreate the user).
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Get('socket-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Short-lived token for the WebSocket handshake',
  })
  socketToken(@Req() req: FastifyRequest) {
    const { email } = (req as any).user as AuthUser;
    return {
      token: this.jwtService.sign(
        { email, purpose: SOCKET_PURPOSE },
        { expiresIn: '60s' },
      ),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the auth cookie' })
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(AUTH_COOKIE, authCookieOptions(this.config));
  }
}
