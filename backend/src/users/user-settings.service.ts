import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type UserSettings = Record<string, Prisma.InputJsonValue>;

/** Generous for UI prefs; stops a runaway client from storing megabytes. */
const MAX_SETTINGS_BYTES = 32 * 1024;

/**
 * Per-user UI settings, stored as one JSON object whose top-level keys are
 * sections (`theme`, `visual`, `viewer`, `polling`, ...). The frontend owns the
 * shape and merges it over its defaults, so the backend only guards size and
 * structure.
 */
@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<UserSettings> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { settings: true },
    });
    return asObject(user.settings);
  }

  /**
   * Replaces the given sections and keeps the rest; `null` removes a section.
   * Sections are replaced whole — the client always sends a complete section.
   */
  async patch(userId: string, patch: unknown): Promise<UserSettings> {
    if (!isPlainObject(patch)) {
      throw new BadRequestException(
        `Settings patch must be a JSON object, got ${Array.isArray(patch) ? 'array' : typeof patch}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { settings: true },
      });
      const next: UserSettings = { ...asObject(user.settings) };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete next[key];
        else next[key] = value as Prisma.InputJsonValue;
      }

      const size = Buffer.byteLength(JSON.stringify(next));
      if (size > MAX_SETTINGS_BYTES) {
        throw new BadRequestException(
          `Settings too large: ${size} bytes (max ${MAX_SETTINGS_BYTES})`,
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { settings: next },
      });
      return next;
    });
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asObject(v: Prisma.JsonValue): UserSettings {
  return isPlainObject(v) ? (v as UserSettings) : {};
}
