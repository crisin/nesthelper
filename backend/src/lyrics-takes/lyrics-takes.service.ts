import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** One heard line of a take, as stored in `LyricsTake.lines`. */
export type TakeLine = {
  text: string;
  startMs: number;
  endMs: number;
  repeat: boolean;
};

/** What the song already has — decides what a take can be used for. */
export type SongLyricsState = 'none' | 'text' | 'synced';

const TAKE_SELECT = {
  id: true,
  source: true,
  recordedAt: true,
  clock: true,
  durationMs: true,
  heardMs: true,
  fromMs: true,
  toMs: true,
  lines: true,
  createdAt: true,
} satisfies Prisma.LyricsTakeSelect;

type TakeRow = Prisma.LyricsTakeGetPayload<{ select: typeof TAKE_SELECT }>;

export type TakeDetail = Omit<TakeRow, 'lines'> & { lines: TakeLine[] };

export type TakeListItem = Omit<TakeRow, 'lines'> & {
  lineCount: number;
  song: {
    spotifyId: string;
    title: string;
    artist: string;
    imgUrl: string | null;
  };
  songLyrics: SongLyricsState;
};

function linesOf(row: TakeRow): TakeLine[] {
  return row.lines as unknown as TakeLine[];
}

/**
 * Takes — what vizzy heard while a song played — on the reading side: the
 * user looks at them, turns one into a lyrics draft (the frontend does that
 * through the normal lyrics endpoints) and throws them away. Always the
 * caller's own takes only.
 */
@Injectable()
export class LyricsTakesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All own takes, newest first, without their lines. */
  async list(userId: string): Promise<TakeListItem[]> {
    const rows = await this.prisma.lyricsTake.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 200,
      select: {
        ...TAKE_SELECT,
        song: {
          select: {
            spotifyId: true,
            title: true,
            artist: true,
            imgUrl: true,
            lyrics: {
              select: {
                rawText: true,
                lines: {
                  where: { timestampMs: { not: null } },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    return rows.map(({ lines, song, ...take }) => {
      const { lyrics, ...songInfo } = song;
      return {
        ...take,
        lineCount: (lines as unknown as TakeLine[]).length,
        song: songInfo,
        songLyrics: !lyrics?.rawText.trim()
          ? 'none'
          : lyrics.lines.length > 0
            ? 'synced'
            : 'text',
      };
    });
  }

  /** Own takes of one song, newest first, with their lines. */
  async forSong(userId: string, spotifyId: string): Promise<TakeDetail[]> {
    const rows = await this.prisma.lyricsTake.findMany({
      where: { userId, song: { spotifyId } },
      orderBy: { recordedAt: 'desc' },
      select: TAKE_SELECT,
    });
    return rows.map((r) => ({ ...r, lines: linesOf(r) }));
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.lyricsTake.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Take not found');
  }
}
