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

  // ── LRCLib preview ──────────────────────────────────────────────────────────

  async lrclibPreview(spotifyId: string): Promise<LrclibPreviewResult | null> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { title: true, artist: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    const hit = await this.fetchLrclibSearch(song.title, song.artist);
    if (!hit) return null;

    const synced = hit.syncedLyrics ? parseLrc(hit.syncedLyrics) : null;

    let lines: LrclibPreviewLine[];
    if (synced && synced.length > 0) {
      lines = synced.map((l) => ({ text: l.text, timestampMs: l.timestampMs }));
    } else if (hit.plainLyrics) {
      lines = hit.plainLyrics.split('\n').map((text) => ({ text }));
    } else {
      return null;
    }

    return {
      trackName: hit.trackName,
      artistName: hit.artistName,
      albumName: hit.albumName,
      isSynced: synced != null && synced.length > 0,
      lines,
    };
  }

  private async fetchLrclibSearch(
    track: string,
    artist: string,
  ): Promise<LrclibApiResponse | null> {
    try {
      const params = new URLSearchParams({ track_name: track, artist_name: artist });
      const res = await fetch(`https://lrclib.net/api/search?${params}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'Lrclib-Client': 'lyrics-helper/1.0 (self-hosted)' },
      });
      if (!res.ok) return null;
      const results = (await res.json()) as LrclibApiResponse[];
      return results[0] ?? null;
    } catch {
      return null;
    }
  }
}

// ── LRCLib types ──────────────────────────────────────────────────────────────

interface LrclibApiResponse {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

function parseLrc(lrc: string): { text: string; timestampMs: number }[] {
  const result: { text: string; timestampMs: number }[] = [];
  for (const line of lrc.split('\n')) {
    const match = /^\[(\d{1,2}):(\d{2}\.\d+)\](.*)$/.exec(line.trim());
    if (!match) continue;
    const min = parseInt(match[1], 10);
    const sec = parseFloat(match[2]);
    const text = match[3].trim();
    result.push({ text, timestampMs: Math.round((min * 60 + sec) * 1000) });
  }
  return result;
}

export interface LrclibPreviewLine {
  text: string;
  timestampMs?: number;
}

export interface LrclibPreviewResult {
  trackName: string;
  artistName: string;
  albumName: string;
  isSynced: boolean;
  lines: LrclibPreviewLine[];
}
