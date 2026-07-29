import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SELECT, type PublicUser } from '../users/user.select';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { hashPassword, normalizeEmail, verifyPassword } from './password.util';

export type AuthResult = { user: PublicUser; access_token: string };

// bcrypt hash of a value nobody will ever submit. Verifying against it burns
// the same ~250ms a real check costs, so an unknown email can't be told apart
// from a wrong password by response time.
const DUMMY_HASH =
  '$2a$12$C6UzMDM.H6dfI/f/IKcEe.6rL5hvHOI5T3JlHtP5PZjNTPCX0TT2K';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalizeEmail(dto.email), mode: 'insensitive' },
      },
    });

    // Same error and the same latency for unknown email and wrong password —
    // no account enumeration, by message or by stopwatch.
    if (!user) {
      await verifyPassword(dto.password, DUMMY_HASH);
      throw new UnauthorizedException('Email oder Passwort ist falsch');
    }
    if (!(await verifyPassword(dto.password, user.password))) {
      throw new UnauthorizedException('Email oder Passwort ist falsch');
    }
    // Only revealed to someone who already proved they own the account.
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Dieser Account ist deaktiviert. Melde dich bei deinem Admin.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      select: { ...USER_SELECT, tokenVersion: true },
    });

    return this.issue(updated);
  }

  /**
   * Returns a fresh token: the password change invalidates every token issued
   * before it, including the one the caller is holding right now.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!(await verifyPassword(currentPassword, user.password))) {
      throw new BadRequestException('Aktuelles Passwort ist falsch');
    }

    return this.applyNewPassword(userId, newPassword);
  }

  /** First-login flow: no current password needed, the temp one just got used. */
  async completeOnboarding(
    userId: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mustChangePassword: true },
    });
    if (!user) throw new UnauthorizedException();
    if (!user.mustChangePassword) {
      throw new BadRequestException(
        'Für diesen Account ist kein Passwortwechsel offen',
      );
    }

    return this.applyNewPassword(userId, newPassword);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: USER_SELECT,
    });
  }

  private async applyNewPassword(
    userId: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        // Kills every token signed with the previous version, including the one
        // the caller is holding — which is why this returns a fresh one.
        tokenVersion: { increment: 1 },
      },
      select: { ...USER_SELECT, tokenVersion: true },
    });

    return this.issue(user);
  }

  /** Splits the internal tokenVersion off the user object the client gets. */
  private issue(user: PublicUser & { tokenVersion: number }): AuthResult {
    const { tokenVersion, ...publicUser } = user;
    return {
      user: publicUser,
      access_token: this.signToken(publicUser, tokenVersion),
    };
  }

  private signToken(
    user: Pick<PublicUser, 'id' | 'email'>,
    tokenVersion: number,
  ): string {
    // JWT_EXPIRES_IN is an untyped env string; assert it into the ms-style
    // literal type the signer expects instead of widening the whole options object.
    const expiresIn = (process.env.JWT_EXPIRES_IN ??
      '7d') as JwtSignOptions['expiresIn'];
    return this.jwt.sign(
      { sub: user.id, email: user.email, v: tokenVersion },
      { expiresIn },
    );
  }
}
