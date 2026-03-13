import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'was',
  'are',
  'were',
  'been',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'that',
  'this',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
  'what',
  'which',
  'who',
  'when',
  'where',
  'how',
  'all',
  'so',
  'if',
  'no',
  'not',
  'up',
  'out',
  'just',
  'like',
  'get',
  'got',
  'go',
  'im',
  'oh',
  'ah',
  'ooh',
  'yeah',
  'yea',
  'na',
  'la',
  'da',
  'gonna',
  'wanna',
  'cause',
  'em',
  'bout',
  'into',
  'than',
  'then',
  'now',
  'dont',
  'cant',
  'wont',
  'aint',
  'never',
  'know',
  'say',
  'said',
  'come',
  'see',
]);

type RawSave = {
  id: string;
  createdAt: Date;
  track: string;
  artist: string;
  artists: string[];
  spotifyId: string | null;
  lyricsStructured: { rawText: string } | null;
  tags: { tag: string }[];
  searchHistory: { imgUrl: string | null } | null;
  song: { imgUrl: string | null } | null;
};

type NewDb = {
  songLyrics: { findMany(args: unknown): Promise<{ rawText: string }[]> };
  song: { findMany(args: unknown): Promise<{ artist: string }[]> };
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Typed accessor for new Prisma models (pre-migration workaround — resolves after npx prisma generate)
  private get newDb(): NewDb {
    return this.prisma as unknown as NewDb;
  }

  async getTopWords(userId: string) {
    const lyrics = await this.newDb.songLyrics.findMany({
      where: { song: { savedBy: { some: { userId } } } },
      select: { rawText: true },
    });
    return this.countWords(lyrics.map((l) => l.rawText));
  }

  async getEmotions(userId: string) {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: {
        song: { savedBy: { some: { userId } } },
        type: 'MOOD',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getArtists(userId: string) {
    const saves = await this.prisma.savedLyric.findMany({
      where: { userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      select: { song: { select: { artist: true } } } as any,
    });
    const freq = new Map<string, number>();
    for (const s of saves as unknown as { song: { artist: string } }[]) {
      const artist = s.song?.artist;
      if (artist) freq.set(artist, (freq.get(artist) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([artist, count]) => ({ artist, count }));
  }

  async getThemes(userId: string) {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: {
        song: { savedBy: { some: { userId } } },
        type: 'CONTEXT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getMonthlyTimeline(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const saves = await this.prisma.savedLyric.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: {
        id: true,
        createdAt: true,
        track: true,
        artist: true,
        artists: true,
        spotifyId: true,
        lyricsStructured: { select: { rawText: true } },
        tags: { where: { type: 'MOOD' } as never, select: { tag: true } },
        searchHistory: { select: { imgUrl: true } },
        song: { select: { imgUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const monthMap = new Map<number, RawSave[]>();
    for (const save of saves as RawSave[]) {
      const m = new Date(save.createdAt).getMonth();
      if (!monthMap.has(m)) monthMap.set(m, []);
      monthMap.get(m)!.push(save);
    }

    const MONTH_NAMES = [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];

    return [...monthMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([m, monthSaves]) => {
        const freq = new Map<string, number>();
        for (const save of monthSaves) {
          for (const { tag } of save.tags) {
            freq.set(tag, (freq.get(tag) ?? 0) + 1);
          }
        }
        const dominantMood =
          [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        const songs = monthSaves.map((save) => ({
          id: save.id,
          track: save.track,
          artist: save.artist,
          artists: save.artists,
          lyrics: save.lyricsStructured?.rawText ?? null,
          searchHistory: {
            imgUrl: save.song?.imgUrl ?? save.searchHistory?.imgUrl ?? null,
            spotifyId: save.spotifyId,
          },
          tags: save.tags,
          createdAt: save.createdAt,
        }));

        return { month: MONTH_NAMES[m], year, dominantMood, songs };
      });
  }

  async getLrclibStats(
    userId: string,
  ): Promise<{ total: number; lrclibCount: number }> {
    const [total, lrclibCount] = await Promise.all([
      this.prisma.songLyrics.count({
        where: { song: { savedBy: { some: { userId } } } },
      }),
      this.prisma.songLyrics.count({
        where: {
          lrclibSource: true,
          song: { savedBy: { some: { userId } } },
        } as never,
      }),
    ]);
    return { total, lrclibCount };
  }

  async getGlobalLrclibStats(): Promise<{
    total: number;
    lrclibCount: number;
  }> {
    const [total, lrclibCount] = await Promise.all([
      this.prisma.songLyrics.count(),
      this.prisma.songLyrics.count({ where: { lrclibSource: true } as never }),
    ]);
    return { total, lrclibCount };
  }

  // ── Global (cross-user) ────────────────────────────────────────────────────

  async getGlobalTopWords() {
    const lyrics = await this.newDb.songLyrics.findMany({
      select: { rawText: true },
    });
    return this.countWords(lyrics.map((l) => l.rawText));
  }

  async getGlobalEmotions() {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: { type: 'MOOD' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getGlobalArtists() {
    const songs = await this.newDb.song.findMany({
      where: { artist: { not: '' } },
      select: { artist: true },
    });
    const freq = new Map<string, number>();
    for (const s of songs) {
      freq.set(s.artist, (freq.get(s.artist) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([artist, count]) => ({ artist, count }));
  }

  async getGlobalThemes() {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: { type: 'CONTEXT' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getGlobalTimeline() {
    return this.buildTimeline();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private countWords(rawTexts: string[]) {
    const freq = new Map<string, number>();
    for (const rawText of rawTexts) {
      const words = rawText
        .toLowerCase()
        .replace(/['\u2018\u2019\u02bc]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
      for (const word of words) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word, count]) => ({ word, count }));
  }

  private async buildTimeline(userId?: string) {
    const since = new Date();
    since.setDate(since.getDate() - 364);

    const saves = await this.prisma.savedLyric.findMany({
      where: { ...(userId ? { userId } : {}), createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const weeks: Record<string, number> = {};
    for (let i = 51; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      weeks[toIsoWeek(d)] = 0;
    }

    for (const { createdAt } of saves) {
      const key = toIsoWeek(new Date(createdAt));
      if (key in weeks) weeks[key] = (weeks[key] ?? 0) + 1;
    }

    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }

  async getTimeline(userId: string) {
    return this.buildTimeline(userId);
  }
}

function toIsoWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
