import { ConfigService } from '@nestjs/config';
import type { CookieSerializeOptions } from '@fastify/cookie';

export const AUTH_COOKIE = 'auth_token';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

/** Fails fast at boot when a required variable is missing. */
export function validateEnv(env: Record<string, unknown>) {
  const missing: string[] = ['JWT_SECRET'];
  if (env.NODE_ENV === 'production') {
    missing.push('MONGODB_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
  }
  const absent = missing.filter((key) => !env[key]);
  if (absent.length > 0) {
    throw new Error(
      `Missing required environment variables: ${absent.join(', ')}`,
    );
  }
  return env;
}

export const isProduction = (config: ConfigService) =>
  config.get<string>('NODE_ENV') === 'production';

export const getFrontendUrl = (config: ConfigService) =>
  config.get<string>('FRONTEND_URL') || DEFAULT_FRONTEND_URL;

export const getMongoUri = (config: ConfigService) =>
  config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/bookmarker');

export function authCookieOptions(
  config: ConfigService,
): CookieSerializeOptions {
  const prod = isProduction(config);
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    path: '/',
  };
}
