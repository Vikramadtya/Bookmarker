import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

/** Who may manage codes: the comma-separated emails in ADMIN_EMAILS. */
export const adminEmails = (config: ConfigService) =>
  (config.get<string>('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = (config: ConfigService, email?: string) =>
  !!email && adminEmails(config).includes(email.toLowerCase());

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest().user;
    // Everyone else sees "not found", so the admin routes are not advertised.
    if (!isAdmin(this.config, user?.email)) throw new NotFoundException();
    return true;
  }
}
