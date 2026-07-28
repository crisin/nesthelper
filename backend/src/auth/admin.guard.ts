import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';

/** Use together with JwtAuthGuard: `@UseGuards(JwtAuthGuard, AdminGuard)`. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: Role } }>();
    if (request.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Nur für Admins');
    }
    return true;
  }
}
