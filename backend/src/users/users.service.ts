import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateTempPassword,
  hashPassword,
  normalizeEmail,
} from '../auth/password.util';
import { USER_SELECT, type PublicUser } from './user.select';

export type ProvisionedUser = { user: PublicUser; tempPassword: string };

/** A user row plus the counters the admin list shows. */
export type AdminUser = PublicUser & { savedSongs: number };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminUser[]> {
    const users = await this.prisma.user.findMany({
      select: { ...USER_SELECT, _count: { select: { savedLyrics: true } } },
      orderBy: [{ isProtected: 'desc' }, { createdAt: 'asc' }],
    });
    return users.map(({ _count, ...user }) => ({
      ...user,
      savedSongs: _count.savedLyrics,
    }));
  }

  /** Creates an account with a generated password the user must replace on first login. */
  async create(input: {
    email: string;
    name?: string;
    role?: Role;
  }): Promise<ProvisionedUser> {
    const email = normalizeEmail(input.email);
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Diese Email wird schon verwendet');
    }

    const tempPassword = generateTempPassword();
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name?.trim() || null,
        password: await hashPassword(tempPassword),
        role: input.role ?? Role.USER,
        mustChangePassword: true,
      },
      select: USER_SELECT,
    });

    return { user, tempPassword };
  }

  /** Generates a new temp password and kills the user's existing sessions. */
  async resetPassword(id: string, actorId: string): Promise<ProvisionedUser> {
    const target = await this.getOrThrow(id);
    // Even another admin must not be able to take over the owner account —
    // the owner changes their own password in the settings.
    if (target.isProtected && target.id !== actorId) {
      throw new ForbiddenException(
        'Das Passwort des geschützten Accounts kann nur von ihm selbst geändert werden',
      );
    }

    const tempPassword = generateTempPassword();
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: await hashPassword(tempPassword),
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        // Whoever is logged in as this person right now gets kicked out.
        tokenVersion: { increment: 1 },
      },
      select: USER_SELECT,
    });

    return { user, tempPassword };
  }

  async update(
    id: string,
    actorId: string,
    patch: { isActive?: boolean; role?: Role; name?: string },
  ): Promise<PublicUser> {
    const target = await this.getOrThrow(id);

    // Decide against the state the patch would produce, not against one field
    // at a time — otherwise `{ role: ADMIN, isActive: false }` sneaks through
    // and creates an "admin" who can't log in and doesn't count as one.
    const nextRole = patch.role ?? target.role;
    const nextActive = patch.isActive ?? target.isActive;

    // Who-may-touch-whom first, so a blocked action explains itself with
    // "geschützter Account" instead of some downstream consistency rule.
    if (patch.isActive === false) {
      this.assertDemotable(target, actorId, 'deaktivieren');
    }
    if (nextRole === Role.USER && target.role === Role.ADMIN) {
      this.assertDemotable(target, actorId, 'zum Nutzer zurückstufen');
    }
    if (nextRole === Role.ADMIN && !nextActive) {
      throw new BadRequestException(
        'Ein deaktivierter Account kann kein Admin sein',
      );
    }

    const losesAdmin =
      target.role === Role.ADMIN &&
      target.isActive &&
      (nextRole !== Role.ADMIN || !nextActive);

    return this.prisma.$transaction(async (tx) => {
      // Inside the transaction so two concurrent demotions can't each see the
      // other admin and both go through.
      if (losesAdmin) await this.assertNotLastAdmin(tx, id);

      return tx.user.update({
        where: { id },
        data: {
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
          ...(patch.name !== undefined
            ? { name: patch.name.trim() || null }
            : {}),
        },
        select: USER_SELECT,
      });
    });
  }

  /**
   * Hard delete, and it reaches further than it looks: every User relation is
   * `onDelete: Cascade`, and the chain SavedLyric → Lyrics → LyricsLine →
   * LineAnnotation means removing one person also removes *other people's*
   * annotations on their lyrics. Collections (public ones included) go too.
   *
   * So: deactivate first (reversible), delete second. Fields that reference a
   * user by bare id instead of a foreign key are nulled here — a SongTag whose
   * `addedBy` points at a deleted user could never be removed or re-added,
   * because `@@unique([songId, tag])` blocks the second attempt.
   */
  async remove(id: string, actorId: string): Promise<void> {
    const target = await this.getOrThrow(id);
    this.assertDemotable(target, actorId, 'löschen');
    if (target.isActive) {
      throw new ConflictException(
        'Deaktiviere den Account zuerst — dann kannst du ihn löschen',
      );
    }
    // No last-admin check needed: a deactivated account was never counted as an
    // active admin, so the deactivation step already enforced the invariant.

    await this.prisma.$transaction(async (tx) => {
      await tx.songTag.updateMany({
        where: { addedBy: id },
        data: { addedBy: null },
      });
      await tx.songLyrics.updateMany({
        where: { lastEditedBy: id },
        data: { lastEditedBy: null },
      });
      await tx.user.delete({ where: { id } });
      // CollectionItem.savedLyricId/.lineId are SetNull, so the cascade leaves
      // pointer-less rows behind in other people's collections.
      await tx.collectionItem.deleteMany({
        where: { savedLyricId: null, lineId: null },
      });
    });
  }

  /**
   * Everyone else in the app, for panels that compare collections. Deliberately
   * narrower than the admin list: no email, no role, no activity timestamps.
   */
  listPeers(): Promise<{ id: string; name: string | null }[]> {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findByEmail(email: string) {
    // findFirst + insensitive so "Max@..." and "max@..." are the same account.
    return this.prisma.user.findFirst({
      where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } },
    });
  }

  private async getOrThrow(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Nutzer nicht gefunden');
    return user;
  }

  /** Blocks the two ways an admin can lock themselves — or the owner — out. */
  private assertDemotable(
    target: PublicUser,
    actorId: string,
    action: string,
  ): void {
    if (target.isProtected) {
      throw new ForbiddenException(
        `Der geschützte Account lässt sich nicht ${action}`,
      );
    }
    if (target.id === actorId) {
      throw new BadRequestException(
        `Du kannst dich nicht selbst ${action} — lass das jemand anderen machen`,
      );
    }
  }

  private async assertNotLastAdmin(
    tx: Prisma.TransactionClient,
    excludeUserId: string,
  ): Promise<void> {
    const remainingAdmins = await tx.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: excludeUserId } },
    });
    if (remainingAdmins === 0) {
      throw new BadRequestException(
        'Das ist der letzte Admin — es muss immer mindestens einer übrig bleiben',
      );
    }
  }
}
