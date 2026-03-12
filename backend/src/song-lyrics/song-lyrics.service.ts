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
        const oldVersions = await tx.lyricsVersion.findMany({
          where: { songLyricsId: existing.id },
          orderBy: { version: 'desc' },
          skip: VERSIONS_TO_KEEP,
          select: { id: true },
        });
        if (oldVersions.length > 0) {
          await tx.lyricsVersion.deleteMany({
            where: { id: { in: oldVersions.map((v) => v.id) } },
          });
        }

        // ── Smart merge: reuse line IDs to preserve timestamps + annotations ──
        const currentLines = await tx.lyricsLine.findMany({
          where: { songLyricsId: existing.id },
          orderBy: { lineNumber: 'asc' },
          select: { id: true, text: true, timestampMs: true },
        });

        const { matched, deletedOldIds } = mergeLines(currentLines, lineTexts);

        // Delete lines that have no match in the new text (cascades to annotations)
        if (deletedOldIds.length > 0) {
          await tx.lyricsLine.deleteMany({ where: { id: { in: deletedOldIds } } });
        }

        // Update matched lines (new position + text, timestamps untouched)
        for (const m of matched) {
          await tx.lyricsLine.update({
            where: { id: m.oldId },
            data: { lineNumber: m.newIndex + 1, text: lineTexts[m.newIndex] },
          });
        }

        // Create new lines that had no match
        const matchedIndices = new Set(matched.map((m) => m.newIndex));
        const newLines = lineTexts
          .map((text, i) => ({ text, lineNumber: i + 1, i }))
          .filter((l) => !matchedIndices.has(l.i));

        if (newLines.length > 0) {
          await tx.lyricsLine.createMany({
            data: newLines.map((l) => ({
              songLyricsId: existing.id,
              lineNumber: l.lineNumber,
              text: l.text,
            })),
          });
        }

        return tx.songLyrics.update({
          where: { id: existing.id },
          data: { rawText, version: { increment: 1 }, lastEditedBy: userId },
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

// ── Line merge helpers ────────────────────────────────────────────────────────

interface OldLineRecord {
  id: string;
  text: string;
  timestampMs: number | null;
}

interface LineMatch {
  oldId: string;
  newIndex: number;
}

interface MergeResult {
  matched: LineMatch[];
  deletedOldIds: string[];
}

const SIMILARITY_THRESHOLD = 0.8;

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Two-row Levenshtein distance (O(m*n) time, O(n) space) */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr.slice();
  }
  return prev[b.length];
}

function lineSimilarity(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return 1;
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  // Skip expensive edit-distance for very long lines — only exact match counts
  if (maxLen > 300) return 0;
  return 1 - levenshtein(na, nb) / maxLen;
}

/**
 * Greedy O(n×m) matching: each new line claims the best unclaimed old line
 * that exceeds SIMILARITY_THRESHOLD. Preserves relative order implicitly
 * because we iterate new lines sequentially.
 */
function mergeLines(oldLines: OldLineRecord[], newTexts: string[]): MergeResult {
  const claimed = new Set<string>();
  const matched: LineMatch[] = [];

  for (let i = 0; i < newTexts.length; i++) {
    let bestId: string | null = null;
    let bestSim = SIMILARITY_THRESHOLD - 0.001;

    for (const old of oldLines) {
      if (claimed.has(old.id)) continue;
      const sim = lineSimilarity(newTexts[i], old.text);
      if (sim > bestSim) {
        bestSim = sim;
        bestId = old.id;
      }
    }

    if (bestId) {
      claimed.add(bestId);
      matched.push({ oldId: bestId, newIndex: i });
    }
  }

  const deletedOldIds = oldLines.filter((o) => !claimed.has(o.id)).map((o) => o.id);
  return { matched, deletedOldIds };
}
