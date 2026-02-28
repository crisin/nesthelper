import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { LyricsFetchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE, LyricsFetchJobData } from './lyrics-fetch.queue';

@Processor(LYRICS_FETCH_QUEUE)
export class LyricsFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(LyricsFetchProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<LyricsFetchJobData>): Promise<void> {
    const { savedLyricId, track, artist } = job.data;
    this.logger.log(`Fetching lyrics for "${track}" by "${artist}" (${savedLyricId})`);

    try {
      const lyrics = await this.fetchFromLyricsOvh(track, artist);

      if (!lyrics) {
        this.logger.warn(`No lyrics found for "${track}" by "${artist}"`);
        await this.setStatus(savedLyricId, LyricsFetchStatus.FAILED);
        return;
      }

      const lines = lyrics.split('\n');

      await this.prisma.$transaction(async (tx) => {
        const created = await tx.lyrics.create({
          data: {
            savedLyricId,
            rawText: lyrics,
            lines: {
              create: lines.map((text, i) => ({ lineNumber: i + 1, text })),
            },
          },
        });
        this.logger.log(`Created Lyrics record ${created.id} with ${lines.length} lines`);

        // Keep legacy lyrics field in sync
        await tx.savedLyric.update({
          where: { id: savedLyricId },
          data: { lyrics, fetchStatus: LyricsFetchStatus.DONE },
        });
      });
    } catch (err) {
      this.logger.error(`Lyrics fetch failed for ${savedLyricId}: ${(err as Error).message}`);
      await this.setStatus(savedLyricId, LyricsFetchStatus.FAILED);
      throw err; // rethrow so BullMQ can retry
    }
  }

  private async setStatus(savedLyricId: string, status: LyricsFetchStatus): Promise<void> {
    await this.prisma.savedLyric.update({
      where: { id: savedLyricId },
      data: { fetchStatus: status },
    });
  }

  /**
   * Fetches lyrics from lyrics.ovh (free, no API key needed).
   * Returns null if the request fails or returns no lyrics.
   */
  private async fetchFromLyricsOvh(track: string, artist: string): Promise<string | null> {
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) return null;

      const data = (await res.json()) as { lyrics?: string; error?: string };
      if (data.error || !data.lyrics) return null;

      // lyrics.ovh sometimes prepends a redundant "Paroles de la chanson …\n\n"
      const cleaned = data.lyrics
        .replace(/^Paroles de la chanson.*?\n\n/s, '')
        .trim();

      return cleaned || null;
    } catch {
      return null;
    }
  }
}
