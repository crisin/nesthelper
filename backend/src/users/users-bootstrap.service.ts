import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateTempPassword,
  hashPassword,
  normalizeEmail,
} from '../auth/password.util';

/**
 * Guarantees that the owner account from ADMIN_EMAIL exists, is active and is
 * an admin — on every boot. That is the recovery path if admin rights ever get
 * messed up: fix the env, restart, log in.
 *
 * Runs on every start and is idempotent. It never touches an existing
 * password — a lost owner password is recovered with `npm run user:reset`.
 */
@Injectable()
export class UsersBootstrapService implements OnModuleInit {
  private readonly logger = new Logger('UsersBootstrap');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const configured = this.config.get<string>('ADMIN_EMAIL');
    if (!configured?.trim()) {
      this.logger.warn(
        'ADMIN_EMAIL is not set — no protected owner account. Set it in backend/.env and restart.',
      );
      await this.warnIfNoAdminExists();
      return;
    }
    const email = normalizeEmail(configured);

    // The protected flag is derived from the env, so a changed ADMIN_EMAIL
    // moves protection instead of leaving two protected accounts behind.
    const { count } = await this.prisma.user.updateMany({
      where: { isProtected: true, email: { not: email } },
      data: { isProtected: false },
    });
    if (count > 0) {
      this.logger.warn(
        `ADMIN_EMAIL changed — removed protection from ${count} previous owner account(s)`,
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, role: true, isActive: true, isProtected: true },
    });

    if (existing) {
      const needsRepair =
        !existing.isProtected ||
        !existing.isActive ||
        existing.role !== Role.ADMIN;
      if (needsRepair) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: Role.ADMIN, isActive: true, isProtected: true },
        });
        this.logger.log(`Repaired owner account ${email} (admin + active)`);
      }
      return;
    }

    // Creating a fresh owner while other accounts already exist usually means
    // ADMIN_EMAIL has a typo — say so instead of quietly adding a stray admin.
    const otherUsers = await this.prisma.user.count();
    if (otherUsers > 0) {
      this.logger.warn(
        `Creating a NEW owner account for ${email} although ${otherUsers} user(s) already exist — is ADMIN_EMAIL a typo?`,
      );
    }

    const configuredPassword = this.config
      .get<string>('ADMIN_INITIAL_PASSWORD')
      ?.trim();
    const password = configuredPassword || generateTempPassword();

    await this.prisma.user.create({
      data: {
        email,
        name: 'Admin',
        password: await hashPassword(password),
        role: Role.ADMIN,
        isProtected: true,
        mustChangePassword: true,
      },
    });

    if (configuredPassword) {
      this.logger.log(
        `Created owner account ${email} with ADMIN_INITIAL_PASSWORD — you must change it on first login`,
      );
    } else {
      // Only place this is ever printed. No ADMIN_INITIAL_PASSWORD was set, so
      // the console is the only way to learn it.
      this.logger.warn(
        `Created owner account ${email} with generated password: ${password}\n` +
          '  ^ change it on first login, it will not be shown again',
      );
    }
  }

  /**
   * Zero admins means /admin is unreachable for everyone and the only way back
   * in is hand-written SQL. Make that impossible to miss in the log.
   */
  private async warnIfNoAdminExists(): Promise<void> {
    const admins = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true },
    });
    if (admins === 0) {
      this.logger.error(
        'NO ACTIVE ADMIN EXISTS — nobody can manage accounts. ' +
          'Set ADMIN_EMAIL in backend/.env and restart, or run: npm run user:reset -- <email>',
      );
    }
  }
}
