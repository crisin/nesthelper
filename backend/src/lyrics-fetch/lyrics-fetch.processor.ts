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
    const { songId, spotifyId, track, artist } = job.data;
    this.logger.log(
      `Fetching lyrics for "${track}" by "${artist}" (${spotifyId})`,
    );

    try {
      const rawText = await this.fetchFromLyricsOvh(track, artist);

      if (!rawText) {
        this.logger.warn(`No lyrics found for "${track}" by "${artist}"`);
        await this.setStatus(songId, LyricsFetchStatus.FAILED);
        return;
      }

      const lines = rawText.split('\n');

      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.songLyrics.findUnique({
          where: { songId },
        });

        if (existing) {
          await tx.lyricsLine.deleteMany({
            where: { songLyricsId: existing.id },
          });
          await tx.songLyrics.update({
            where: { id: existing.id },
            data: {
              rawText,
              version: { increment: 1 },
              lines: {
                create: lines.map((text, i) => ({ lineNumber: i + 1, text })),
              },
            },
          });
        } else {
          await tx.songLyrics.create({
            data: {
              songId,
              rawText,
              lines: {
                create: lines.map((text, i) => ({ lineNumber: i + 1, text })),
              },
            },
          });
        }

        await tx.song.update({
          where: { id: songId },
          data: { fetchStatus: LyricsFetchStatus.DONE },
        });
      });

      this.logger.log(
        `Stored lyrics for song ${spotifyId} (${lines.length} lines)`,
      );
    } catch (err) {
      this.logger.error(
        `Lyrics fetch failed for ${spotifyId}: ${(err as Error).message}`,
      );
      await this.setStatus(songId, LyricsFetchStatus.FAILED);
      throw err; // rethrow so BullMQ can retry
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

  private async fetchFromLyricsOvh(
    track: string,
    artist: string,
  ): Promise<string | null> {
    try {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) return null;

      const data = (await res.json()) as { lyrics?: string; error?: string };
      if (data.error || !data.lyrics) return null;

      const cleaned = data.lyrics
        .replace(/^Paroles de la chanson.*?\n\n/s, '')
        .trim();

      return cleaned || null;
    } catch {
      return null;
    }
  }
}
