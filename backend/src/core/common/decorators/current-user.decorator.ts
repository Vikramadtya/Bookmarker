import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * Extracts the user object from the request.
 * If a data parameter is provided (e.g. @CurrentUser('email')), it extracts just that property.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;
    return data ? user?.[data] : user;
  },
);
