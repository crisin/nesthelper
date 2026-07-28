import {
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * The only endpoints a user with `mustChangePassword` may still reach.
 * Everything else in the app is blocked until they pick a new password —
 * a frontend redirect alone would be bypassable with a raw HTTP client.
 */
const PASSWORD_CHANGE_ALLOWLIST = [
  '/auth/me',
  '/auth/password',
  '/auth/complete-onboarding',
];

export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

type GatedRequest = Request & {
  user?: { mustChangePassword?: boolean };
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = (await super.canActivate(context)) as boolean;
    if (!activated) return false;

    const request = context.switchToHttp().getRequest<GatedRequest>();
    if (request.user?.mustChangePassword) {
      const path = (request.path || request.url || '').split('?')[0];
      if (!PASSWORD_CHANGE_ALLOWLIST.includes(path)) {
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          code: PASSWORD_CHANGE_REQUIRED,
          message: 'Bitte lege zuerst ein neues Passwort fest',
        });
      }
    }

    return true;
  }
}
