import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SELECT, type PublicUser } from '../users/user.select';

interface JwtPayload {
  sub: string;
  email: string;
  /** Issued-at in seconds, added by @nestjs/jwt. */
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Same lookup the signer uses (auth.module.ts) — reading the raw env here
      // meant verification could silently disagree with signing.
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { ...USER_SELECT, passwordChangedAt: true },
    });
    if (!user) throw new UnauthorizedException();

    // Role and active state are read fresh on every request, so promoting or
    // deactivating someone takes effect immediately — no waiting for the token
    // to expire.
    if (!user.isActive) {
      throw new UnauthorizedException('Dieser Account ist deaktiviert');
    }

    const { passwordChangedAt, ...publicUser } = user;

    // Tokens issued before the last password change are dead. `iat` is a
    // whole-second value, so compare against the truncated timestamp —
    // otherwise the token handed out by the change itself rejects itself.
    if (passwordChangedAt && payload.iat !== undefined) {
      const changedAt = Math.floor(passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedAt) {
        throw new UnauthorizedException(
          'Sitzung abgelaufen, bitte neu anmelden',
        );
      }
    }

    return publicUser;
  }
}
