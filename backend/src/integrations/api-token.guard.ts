import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTokensService } from './api-tokens.service';

/**
 * Auth for integrations (vizzy & co.): a personal API token instead of the
 * 7-day login JWT, so a local tool can stay connected without a password.
 * Equivalent to JwtAuthGuard for the routes it protects: same user scoping
 * (`req.user.id`), inactive / onboarding accounts are refused.
 */
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly tokens: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const user = token ? await this.tokens.resolve(token) : null;
    if (!user) throw new UnauthorizedException('Ungültiger API-Token');
    req.user = user;
    return true;
  }
}
