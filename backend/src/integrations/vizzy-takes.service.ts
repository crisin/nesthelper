import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** One heard line, with its place in the song. */
export type TakeLine = {
  text: string;
  startMs: number;
  endMs: number;
  repeat: boolean;
};

/** A take as vizzy sends it (its `lyrics-takes/*.json`, unchanged). */
export type TakeUpload = {
  spotifyId: string;
  artist: string;
  title: string;
  durationMs?: number | null;
  recordedAt: string;
  clock: string;
  coverage: { fromMs: number; toMs: number };
  heardMs: number;
  engine?: Record<string, unknown> | null;
  lines: TakeLine[];
};

export type TakeReceipt = {
  id: string;
  spotifyId: string;
  /** false when the same take was sent before and is now replaced */
  created: boolean;
  lines: number;
};

/** takes kept per user and song; older ones go when a new one arrives */
export const TAKES_KEPT = 3;

/**
 * Takes: what vizzy heard while a song played — rough lyrics with song
 * times. Raw material next to the song: storing one never touches
 * `SongLyrics`. Taking it over into the lyrics is a separate, manual step.
 */
@Injectable()
export class VizzyTakesService {
  constructor(private readonly prisma: PrismaService) {}

  async store(userId: string, take: TakeUpload): Promise<TakeReceipt> {
    const recordedAt = new Date(take.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) {
      throw new BadRequestException('recordedAt is not a date');
    }
    const lines = take.lines
      .map((l) => ({
        text: l.text.trim(),
        startMs: l.startMs,
        endMs: Math.max(l.endMs, l.startMs),
        repeat: l.repeat,
      }))
      .filter((l) => l.text !== '')
      .sort((a, b) => a.startMs - b.startMs);
    if (lines.length === 0) {
      throw new BadRequestException('a take needs at least one line');
    }

    // the song may be new here: vizzy hears things nobody saved yet
    const artist = take.artist.trim();
    const song = await this.prisma.song.upsert({
      where: { spotifyId: take.spotifyId },
      create: {
        spotifyId: take.spotifyId,
        title: take.title.trim(),
        artist,
        artists: artist ? [artist] : [],
      },
      update: {},
      select: { id: true, spotifyId: true },
    });

    const data = {
      clock: take.clock,
      durationMs: take.durationMs ?? null,
      heardMs: take.heardMs,
      fromMs: lines[0].startMs,
      toMs: Math.max(...lines.map((l) => l.endMs)),
      ...(take.engine ? { engine: take.engine as object } : {}),
      lines: lines as object,
    };
    const key = { userId, songId: song.id, recordedAt };
    // vizzy rewrites a take while the song plays; the same one may come twice
    const before = await this.prisma.lyricsTake.findUnique({
      where: { userId_songId_recordedAt: key },
      select: { id: true },
    });
    const saved = await this.prisma.lyricsTake.upsert({
      where: { userId_songId_recordedAt: key },
      create: { ...key, source: 'vizzy', ...data },
      update: data,
      select: { id: true },
    });

    const all = await this.prisma.lyricsTake.findMany({
      where: { userId, songId: song.id },
      orderBy: { recordedAt: 'desc' },
      select: { id: true },
    });
    const old = all.slice(TAKES_KEPT).map((t) => t.id);
    if (old.length) {
      await this.prisma.lyricsTake.deleteMany({ where: { id: { in: old } } });
    }

    return {
      id: saved.id,
      spotifyId: song.spotifyId,
      created: !before,
      lines: lines.length,
    };
  }
}
