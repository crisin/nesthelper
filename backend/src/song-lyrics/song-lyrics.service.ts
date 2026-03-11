import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE } from '../lyrics-fetch/lyrics-fetch.queue';

const VERSIONS_TO_KEEP = 20;

const LYRICS_INCLUDE = {
  lines: { orderBy: { lineNumber: 'asc' as const } },
  versions: { orderBy: { version: 'desc' as const }, take: VERSIONS_TO_KEEP },
} satisfies Prisma.SongLyricsInclude;

export type SongLyricsWithContent = Prisma.SongLyricsGetPayload<{
  include: typeof LYRICS_INCLUDE;
}>;

@Injectable()
export class SongLyricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @InjectQueue(LYRICS_FETCH_QUEUE)
    private readonly lyricsQueue: Queue | null,
  ) {}

  async get(spotifyId: string): Promise<SongLyricsWithContent | null> {
    const song = await this.prisma.song.findUnique({ where: { spotifyId } });
    if (!song) return null;

    return this.prisma.songLyrics.findUnique({
      where: { songId: song.id },
      include: LYRICS_INCLUDE,
    });
  }

  async upsert(
    userId: string,
    spotifyId: string,
    rawText: string,
    expectedVersion?: number,
  ): Promise<SongLyricsWithContent> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    const existing = await this.prisma.songLyrics.findUnique({
      where: { songId: song.id },
    });

    // Optimistic locking: reject if version doesn't match
    if (
      existing &&
      expectedVersion !== undefined &&
      existing.version !== expectedVersion
    ) {
      throw new ConflictException(
        `Version conflict: document is at version ${existing.version}, you sent ${expectedVersion}. Reload and try again.`,
      );
    }

    const lineTexts = rawText.split('\n');

    if (existing) {
      return this.prisma.$transaction(async (tx) => {
        // Snapshot current state
        await tx.lyricsVersion.create({
          data: {
            songLyricsId: existing.id,
            version: existing.version,
            rawText: existing.rawText,
          },
        });

        // Prune old versions beyond limit
        const old = await tx.lyricsVersion.findMany({
          where: { songLyricsId: existing.id },
          orderBy: { version: 'desc' },
          skip: VERSIONS_TO_KEEP,
          select: { id: true },
        });
        if (old.length > 0) {
          await tx.lyricsVersion.deleteMany({
            where: { id: { in: old.map((v) => v.id) } },
          });
        }

        // Replace all lines
        await tx.lyricsLine.deleteMany({
          where: { songLyricsId: existing.id },
        });

        return tx.songLyrics.update({
          where: { id: existing.id },
          data: {
            rawText,
            version: { increment: 1 },
            lastEditedBy: userId,
            lines: {
              create: lineTexts.map((text, i) => ({ lineNumber: i + 1, text })),
            },
          },
          include: LYRICS_INCLUDE,
        });
      });
    }

    return this.prisma.songLyrics.create({
      data: {
        songId: song.id,
        rawText,
        lastEditedBy: userId,
        lines: {
          create: lineTexts.map((text, i) => ({ lineNumber: i + 1, text })),
        },
      },
      include: LYRICS_INCLUDE,
    });
  }

  async restoreVersion(
    userId: string,
    spotifyId: string,
    version: number,
  ): Promise<SongLyricsWithContent> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    const lyrics = await this.prisma.songLyrics.findUnique({
      where: { songId: song.id },
    });
    if (!lyrics) throw new NotFoundException('Lyrics not found');

    const snap = await this.prisma.lyricsVersion.findFirst({
      where: { songLyricsId: lyrics.id, version },
    });
    if (!snap) throw new NotFoundException(`Version ${version} not found`);

    return this.upsert(userId, spotifyId, snap.rawText);
  }

  async enqueueFetch(spotifyId: string): Promise<{ status: string }> {
    if (!this.lyricsQueue) {
      throw new ConflictException('Lyrics fetch queue not available');
    }

    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true, title: true, artist: true, fetchStatus: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    await this.prisma.song.update({
      where: { spotifyId },
      data: { fetchStatus: 'FETCHING' },
    });

    await this.lyricsQueue.add(
      'fetch',
      { songId: song.id, spotifyId, track: song.title, artist: song.artist },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { status: 'queued' };
  }

  async updateTimestamps(
    spotifyId: string,
    lines: { id: string; timestampMs: number | null }[],
  ): Promise<SongLyricsWithContent> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    const lyrics = await this.prisma.songLyrics.findUnique({
      where: { songId: song.id },
    });
    if (!lyrics) throw new NotFoundException('Lyrics not found');

    await this.prisma.$transaction(
      lines.map(({ id, timestampMs }) =>
        this.prisma.lyricsLine.update({
          where: { id },
          data: { timestampMs },
        }),
      ),
    );

    return this.prisma.songLyrics.findUniqueOrThrow({
      where: { songId: song.id },
      include: LYRICS_INCLUDE,
    });
  }
}
