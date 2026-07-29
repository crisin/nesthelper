import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SELECT, type PublicUser } from '../users/user.select';

interface JwtPayload {
  sub: string;
  email: string;
  /** User.tokenVersion at signing time. Absent in tokens issued before it existed. */
  v?: number;
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
      select: { ...USER_SELECT, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException();

    // Role and active state are read fresh on every request, so promoting or
    // deactivating someone takes effect immediately — no waiting for the token
    // to expire.
    if (!user.isActive) {
      throw new UnauthorizedException('Dieser Account ist deaktiviert');
    }

    const { tokenVersion, ...publicUser } = user;

    // Every password change bumps tokenVersion, so tokens signed before it stop
    // matching. Tokens minted before this field existed carry no `v` and count
    // as 0 — the same value every existing account starts at, so nobody gets
    // logged out by the deploy itself.
    if ((payload.v ?? 0) !== tokenVersion) {
      throw new UnauthorizedException('Sitzung abgelaufen, bitte neu anmelden');
    }

    return publicUser;
  }
}
