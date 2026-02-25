import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VERSIONS_TO_KEEP = 20;

@Injectable()
export class LyricsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, savedLyricId: string) {
    await this.assertOwnership(userId, savedLyricId);

    return this.prisma.lyrics.findUnique({
      where: { savedLyricId },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
        versions: { orderBy: { version: 'desc' }, take: VERSIONS_TO_KEEP },
      },
    });
  }

  async upsert(userId: string, savedLyricId: string, rawText: string) {
    await this.assertOwnership(userId, savedLyricId);

    const existing = await this.prisma.lyrics.findUnique({
      where: { savedLyricId },
    });

    const lines = this.parseLines(rawText);

    let result: Awaited<ReturnType<typeof this.prisma.lyrics.findUnique>>;

    if (existing) {
      result = await this.prisma.$transaction(async (tx) => {
        // Snapshot current state as a new version entry
        await tx.lyricsVersion.create({
          data: { lyricsId: existing.id, version: existing.version, rawText: existing.rawText },
        });

        // Prune old versions beyond limit
        const old = await tx.lyricsVersion.findMany({
          where: { lyricsId: existing.id },
          orderBy: { version: 'desc' },
          skip: VERSIONS_TO_KEEP,
          select: { id: true },
        });
        if (old.length > 0) {
          await tx.lyricsVersion.deleteMany({ where: { id: { in: old.map((v) => v.id) } } });
        }

        // Replace all lines
        await tx.lyricsLine.deleteMany({ where: { lyricsId: existing.id } });

        return tx.lyrics.update({
          where: { id: existing.id },
          data: {
            rawText,
            version: { increment: 1 },
            lines: { create: lines.map((text, i) => ({ lineNumber: i + 1, text })) },
          },
          include: {
            lines: { orderBy: { lineNumber: 'asc' } },
            versions: { orderBy: { version: 'desc' }, take: VERSIONS_TO_KEEP },
          },
        });
      });
    } else {
      result = await this.prisma.lyrics.create({
        data: {
          savedLyricId,
          rawText,
          lines: { create: lines.map((text, i) => ({ lineNumber: i + 1, text })) },
        },
        include: {
          lines: { orderBy: { lineNumber: 'asc' } },
          versions: { orderBy: { version: 'desc' }, take: VERSIONS_TO_KEEP },
        },
      });
    }

    // Keep legacy lyrics field in sync for backwards compat
    await this.prisma.savedLyric.update({
      where: { id: savedLyricId },
      data: { lyrics: rawText },
    });

    return result;
  }

  async restoreVersion(userId: string, savedLyricId: string, version: number) {
    await this.assertOwnership(userId, savedLyricId);

    const lyrics = await this.prisma.lyrics.findUnique({ where: { savedLyricId } });
    if (!lyrics) throw new NotFoundException('Lyrics not found');

    const snap = await this.prisma.lyricsVersion.findFirst({
      where: { lyricsId: lyrics.id, version },
    });
    if (!snap) throw new NotFoundException(`Version ${version} not found`);

    return this.upsert(userId, savedLyricId, snap.rawText);
  }

  private parseLines(rawText: string): string[] {
    // Preserve structure: keep empty lines (they represent stanza breaks)
    return rawText.split('\n');
  }

  private async assertOwnership(userId: string, savedLyricId: string) {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id: savedLyricId, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');
  }
}
