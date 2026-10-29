import { SetMetadata } from '@nestjs/common';

/**
 * Mark a route as public — bypasses the global JwtAuthGuard.
 * Usage: @Public() on a controller or route handler.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
