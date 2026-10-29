import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: config.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:8080/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: any) {
    const email = profile.emails?.[0];
    if (!email?.value || email.verified === false) {
      throw new UnauthorizedException('A verified Google email is required');
    }
    return {
      email: email.value as string,
      firstName: (profile.name?.givenName as string) || 'User',
      picture: (profile.photos?.[0]?.value as string) || '',
    };
  }
}
