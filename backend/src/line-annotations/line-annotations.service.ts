import { Injectable } from '@nestjs/common';
import { LineAnnotation, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class UpsertAnnotationDto {
  text!: string;
  emoji?: string;
}

const ANNOTATION_INCLUDE = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.LineAnnotationInclude;

export type AnnotationWithUser = Prisma.LineAnnotationGetPayload<{
  include: typeof ANNOTATION_INCLUDE;
}>;

@Injectable()
export class LineAnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All annotations for all lines of a song, keyed by lineId. */
  async getForSong(
    spotifyId: string,
  ): Promise<Record<string, AnnotationWithUser[]>> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { lyrics: { select: { id: true } } },
    });
    if (!song?.lyrics) return {};

    const annotations = await this.prisma.lineAnnotation.findMany({
      where: { line: { songLyricsId: song.lyrics.id } },
      include: ANNOTATION_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const result: Record<string, AnnotationWithUser[]> = {};
    for (const a of annotations) {
      (result[a.lineId] ??= []).push(a);
    }
    return result;
  }

  /** Create-or-update the current user's annotation on a line. */
  async upsert(
    userId: string,
    lineId: string,
    dto: UpsertAnnotationDto,
  ): Promise<AnnotationWithUser> {
    return this.prisma.lineAnnotation.upsert({
      where: { userId_lineId: { userId, lineId } },
      create: { lineId, userId, text: dto.text, emoji: dto.emoji ?? null },
      update: { text: dto.text, emoji: dto.emoji ?? null },
      include: ANNOTATION_INCLUDE,
    });
  }

  /** Delete the current user's annotation for a specific line. */
  async removeByLine(userId: string, lineId: string): Promise<void> {
    await this.prisma.lineAnnotation.deleteMany({ where: { userId, lineId } });
  }

  // Legacy — no longer called after route migration
  async getForLine(_userId: string, lineId: string): Promise<LineAnnotation[]> {
    return this.prisma.lineAnnotation.findMany({
      where: { lineId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
