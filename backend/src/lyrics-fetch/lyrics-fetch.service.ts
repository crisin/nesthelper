import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { LyricsFetchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE, LyricsFetchJobData } from './lyrics-fetch.queue';

/** A FETCHING song untouched for this long is assumed lost and restarted. */
const STALE_FETCH_MS = 10 * 60_000;
/** After Redis fails, skip it for this long instead of paying the error per song. */
const QUEUE_BACKOFF_MS = 60_000;
const QUEUE_ADD_TIMEOUT_MS = 3_000;

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

export type LyricsFetchOutcome = 'queued' | 'inline' | 'skipped';

/**
 * The one way to start a lyrics fetch.
 *
 * Prefers the BullMQ queue, but never lets it break the caller: when Redis is
 * missing or unreachable the fetch runs in-process instead (one at a time, so
 * a bulk import doesn't fire hundreds of LRCLib requests at once). Songs left
 * in FETCHING by a lost job are picked up again on boot and every 10 minutes.
 */
@Injectable()
export class LyricsFetchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LyricsFetchService.name);
  private queueDownUntil = 0;
  /** Serial chain for in-process fetches. */
  private inline: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @InjectQueue(LYRICS_FETCH_QUEUE)
    private readonly queue: Queue | null,
  ) {}

  /**
   * Starts a fetch for the song. Without `force`, only songs that never had
   * one (IDLE) or whose fetch got lost (stale FETCHING) are started.
   * Never throws for queue problems — only for a missing song.
   */
  async request(
    songId: string,
    { force = false }: { force?: boolean } = {},
  ): Promise<LyricsFetchOutcome> {
    const song = await this.prisma.song.findUniqueOrThrow({
      where: { id: songId },
      select: {
        id: true,
        spotifyId: true,
        title: true,
        artist: true,
        durationMs: true,
        fetchStatus: true,
        updatedAt: true,
      },
    });

    const stale =
      song.fetchStatus === 'FETCHING' &&
      Date.now() - song.updatedAt.getTime() > STALE_FETCH_MS;
    if (!force && song.fetchStatus !== 'IDLE' && !stale) return 'skipped';

    await this.setStatus(song.id, LyricsFetchStatus.FETCHING);
    const data: LyricsFetchJobData = {
      songId: song.id,
      spotifyId: song.spotifyId,
      track: song.title,
      artist: song.artist,
      durationMs: song.durationMs ?? undefined,
    };

    if (this.queue && Date.now() >= this.queueDownUntil) {
      try {
        await withTimeout(
          this.queue.add('fetch', data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
          }),
          QUEUE_ADD_TIMEOUT_MS,
        );
        return 'queued';
      } catch (err) {
        this.queueDownUntil = Date.now() + QUEUE_BACKOFF_MS;
        this.logger.warn(
          `Lyrics queue unavailable (${describe(err)}); fetching in-process for the next ${QUEUE_BACKOFF_MS / 1000}s`,
        );
      }
    }

    this.inline = this.inline
      .then(() => this.fetchAndStore(data))
      .catch(() => undefined); // fetchAndStore already logged + marked FAILED
    return 'inline';
  }

  onApplicationBootstrap(): void {
    // Don't hold up startup; the heal runs in the background.
    void this.healStaleFetches();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async healStaleFetches(): Promise<void> {
    try {
      const stale = await this.prisma.song.findMany({
        where: {
          fetchStatus: 'FETCHING',
          updatedAt: { lt: new Date(Date.now() - STALE_FETCH_MS) },
        },
        select: { id: true },
      });
      if (!stale.length) return;
      this.logger.warn(`Restarting ${stale.length} stale lyrics fetch(es)`);
      for (const { id } of stale) await this.request(id, { force: true });
    } catch (err) {
      this.logger.error(
        `Healing stale lyrics fetches failed: ${describe(err)}`,
      );
    }
  }

  /** Fetches from LRCLib and stores the result. Marks FAILED and rethrows on error. */
  async fetchAndStore(data: LyricsFetchJobData): Promise<void> {
    const { songId, spotifyId, track, artist, durationMs } = data;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

function describe(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}
