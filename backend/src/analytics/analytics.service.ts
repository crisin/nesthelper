import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { countWords, languageBreakdown, signatureWords } from './text.util';
import { buildArtistGraph } from './artist-graph.util';

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

  /**
   * Language split plus the words that belong to each artist rather than to the
   * collection as a whole. Plain frequency gives everyone the same handful of
   * words; weighting against the rest of the corpus is what makes it a profile.
   */
  async getLanguageProfile(userId?: string) {
    const lyrics = await this.prisma.songLyrics.findMany({
      where: {
        rawText: { not: '' },
        ...(userId ? { song: { savedBy: { some: { userId } } } } : {}),
      },
      select: { rawText: true, song: { select: { artist: true } } },
    });

    const documents = lyrics.map((entry) => ({
      text: entry.rawText,
      group: entry.song?.artist || undefined,
    }));

    return {
      songsWithLyrics: documents.length,
      languages: languageBreakdown(documents),
      signatures: signatureWords(documents),
    };
  }

  /**
   * The artist network. Four independent signals, because any single one is
   * too sparse on its own: credited features, artists heard in the same
   * listening session, artists sharing a tag, and artists sharing a collection.
   */
  async getArtistGraph(userId?: string) {
    const mine = userId ? { savedBy: { some: { userId } } } : {};

    const [saves, plays, tagged, collected] = await Promise.all([
      this.prisma.savedLyric.findMany({
        where: userId ? { userId } : {},
        select: {
          song: {
            select: { title: true, artist: true, artists: true, imgUrl: true },
          },
        },
      }),
      this.prisma.playHistory.findMany({
        where: { ...(userId ? { userId } : {}), artist: { not: '' } },
        select: { artist: true, playedAt: true },
        orderBy: { playedAt: 'asc' },
        take: 5000,
      }),
      this.prisma.songTag.findMany({
        where: { song: mine },
        select: { tag: true, song: { select: { artist: true } } },
      }),
      this.prisma.collectionItem.findMany({
        where: userId ? { collection: { userId } } : {},
        select: {
          collectionId: true,
          savedLyric: { select: { song: { select: { artist: true } } } },
        },
      }),
    ]);

    const songCount = new Map<string, number>();
    const artistImage = new Map<string, string | null>();
    const songArtists: { artists: string[]; title: string }[] = [];

    for (const save of saves) {
      const song = save.song;
      if (!song?.artist) continue;
      // `artists` holds every credit; `artist` is the primary one and is the
      // key the rest of the app groups by.
      const credits = song.artists.length ? song.artists : [song.artist];
      songArtists.push({ artists: credits, title: song.title });
      songCount.set(song.artist, (songCount.get(song.artist) ?? 0) + 1);
      for (const credit of credits) {
        if (!artistImage.has(credit)) artistImage.set(credit, song.imgUrl);
        if (!songCount.has(credit)) songCount.set(credit, 1);
      }
    }

    return buildArtistGraph({
      songArtists,
      songCount,
      artistImage,
      plays: plays.map((p) => ({ artist: p.artist, playedAt: p.playedAt })),
      tagged: tagged
        .filter((t) => t.song?.artist)
        .map((t) => ({ tag: t.tag, artist: t.song!.artist })),
      collected: collected
        .filter((c) => c.savedLyric?.song?.artist)
        .map((c) => ({
          collectionId: c.collectionId,
          artist: c.savedLyric!.song!.artist,
        })),
    });
  }

  async getEmotions(userId: string) {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: {
        song: { savedBy: { some: { userId } } },
        type: 'MOOD',
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

  /**
   * Delegates to text.util, which picks the stopword list per document by
   * detected language. The previous implementation filtered English stopwords
   * against a mixed German/English corpus, so German songs contributed nothing
   * but their own function words.
   */
  private countWords(rawTexts: string[]) {
    return countWords(rawTexts.map((text) => ({ text })));
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
