import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LyricsFetchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE, LyricsFetchJobData } from './lyrics-fetch.queue';

interface LrclibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

/** Parse LRC format: [mm:ss.xx]text → timestamped lines */
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

@Processor(LYRICS_FETCH_QUEUE)
export class LyricsFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(LyricsFetchProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<LyricsFetchJobData>): Promise<void> {
    const { songId, spotifyId, track, artist, durationMs } = job.data;
    this.logger.log(
      `Fetching lyrics for "${track}" by "${artist}" (${spotifyId})`,
    );

    try {
      const result = await this.fetchFromLrclib(track, artist, durationMs);

      if (!result) {
        this.logger.warn(`No lyrics found for "${track}" by "${artist}"`);
        await this.setStatus(songId, LyricsFetchStatus.FAILED);
        return;
      }

      const { rawText, lines } = result;

      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.songLyrics.findUnique({ where: { songId } });

        if (existing) {
          await tx.lyricsLine.deleteMany({
            where: { songLyricsId: existing.id },
          });
          await tx.songLyrics.update({
            where: { id: existing.id },
            data: {
              rawText,
              lrclibSource: true,
              version: { increment: 1 },
              lines: {
                create: lines.map((l, i) => ({
                  lineNumber: i + 1,
                  text: l.text,
                  timestampMs: l.timestampMs ?? null,
                })),
              },
            },
          });
        } else {
          await tx.songLyrics.create({
            data: {
              songId,
              rawText,
              lrclibSource: true,
              lines: {
                create: lines.map((l, i) => ({
                  lineNumber: i + 1,
                  text: l.text,
                  timestampMs: l.timestampMs ?? null,
                })),
              },
            },
          });
        }

        await tx.song.update({
          where: { id: songId },
          data: { fetchStatus: LyricsFetchStatus.DONE },
        });
      });

      const synced = lines.some((l) => l.timestampMs != null);
      this.logger.log(
        `Stored lyrics for ${spotifyId} (${lines.length} lines, synced=${synced})`,
      );
    } catch (err) {
      this.logger.error(
        `Lyrics fetch failed for ${spotifyId}: ${(err as Error).message}`,
      );
      await this.setStatus(songId, LyricsFetchStatus.FAILED);
      throw err;
    }
  }

  private async setStatus(
    songId: string,
    status: LyricsFetchStatus,
  ): Promise<void> {
    await this.prisma.song.update({
      where: { id: songId },
      data: { fetchStatus: status },
    });
  }

  private async fetchFromLrclib(
    track: string,
    artist: string,
    durationMs?: number,
  ): Promise<{
    rawText: string;
    lines: { text: string; timestampMs?: number }[];
  } | null> {
    try {
      // Try exact match first (with duration if available), fall back to search
      const hit = durationMs
        ? await this.lrclibGet(track, artist, durationMs)
        : await this.lrclibSearch(track, artist);

      if (!hit) return null;

      // Prefer synced lyrics when available
      if (hit.syncedLyrics) {
        const parsed = parseLrc(hit.syncedLyrics);
        if (parsed.length > 0) {
          return {
            rawText: parsed.map((l) => l.text).join('\n'),
            lines: parsed,
          };
        }
      }

      if (hit.plainLyrics) {
        const lines = hit.plainLyrics.split('\n').map((text) => ({ text }));
        return { rawText: hit.plainLyrics, lines };
      }

      return null;
    } catch (err) {
      this.logger.warn(`LRCLib fetch error: ${(err as Error).message}`);
      return null;
    }
  }

  private async lrclibGet(
    track: string,
    artist: string,
    durationMs: number,
  ): Promise<LrclibResponse | null> {
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist,
      duration: String(Math.round(durationMs / 1000)),
    });
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Lrclib-Client': 'lyrics-helper/1.0 (self-hosted)' },
    });
    if (res.status === 404) return this.lrclibSearch(track, artist);
    if (!res.ok) return null;
    return (await res.json()) as LrclibResponse;
  }

  private async lrclibSearch(
    track: string,
    artist: string,
  ): Promise<LrclibResponse | null> {
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist,
    });
    const res = await fetch(`https://lrclib.net/api/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Lrclib-Client': 'lyrics-helper/1.0 (self-hosted)' },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as LrclibResponse[];
    return results[0] ?? null;
  }
}
