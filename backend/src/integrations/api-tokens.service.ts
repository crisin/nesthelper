import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Plain tokens look like `nh_<43 url-safe chars>`. */
export const API_TOKEN_PREFIX = 'nh_';

/** Don't write `lastUsedAt` on every request — once a minute is plenty. */
const LAST_USED_RESOLUTION_MS = 60_000;

export type ApiTokenInfo = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

const INFO_SELECT = {
  id: true,
  name: true,
  prefix: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class ApiTokensService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<ApiTokenInfo[]> {
    return this.prisma.apiToken.findMany({
      where: { userId },
      select: INFO_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Returns the plain token — the only time it is ever visible. */
  async create(
    userId: string,
    name: string,
  ): Promise<{ token: string; info: ApiTokenInfo }> {
    const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const info = await this.prisma.apiToken.create({
      data: {
        userId,
        name: name.trim().slice(0, 60) || 'Token',
        prefix: token.slice(0, 10),
        tokenHash: hashToken(token),
      },
      select: INFO_SELECT,
    });
    return { token, info };
  }

  async revoke(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.apiToken.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Token not found');
  }

  /**
   * The user a plain token belongs to, or null. Inactive accounts and
   * accounts that still have to set a password get nothing.
   */
  async resolve(token: string): Promise<{ id: string } | null> {
    if (!token.startsWith(API_TOKEN_PREFIX)) return null;
    const row = await this.prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        lastUsedAt: true,
        user: {
          select: { id: true, isActive: true, mustChangePassword: true },
        },
      },
    });
    if (!row || !row.user.isActive || row.user.mustChangePassword) return null;

    const now = Date.now();
    if (
      !row.lastUsedAt ||
      now - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    ) {
      await this.prisma.apiToken.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date(now) },
      });
    }
    return { id: row.user.id };
  }
}
