import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'were', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'that', 'this',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him',
  'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'what', 'which', 'who', 'when', 'where', 'how', 'all', 'so', 'if',
  'no', 'not', 'up', 'out', 'just', 'like', 'get', 'got', 'go', 'im',
  'oh', 'ah', 'ooh', 'yeah', 'yea', 'na', 'la', 'da', 'gonna', 'wanna',
  'cause', 'em', 'bout', 'into', 'than', 'then', 'now', 'its', 'dont',
  'cant', 'wont', 'aint', 'never', 'know', 'say', 'said', 'come', 'see',
]);

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopWords(userId: string) {
    const lyrics = await this.prisma.lyrics.findMany({
      where: { savedLyric: { userId } },
      select: { rawText: true },
    });

    const freq = new Map<string, number>();
    for (const { rawText } of lyrics) {
      const words = rawText
        .toLowerCase()
        .replace(/[^a-z0-9'\s]/g, ' ')
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

  async getEmotions(userId: string) {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: { savedLyric: { userId }, type: 'MOOD' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getArtists(userId: string) {
    const rows = await this.prisma.savedLyric.groupBy({
      by: ['artist'],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({ artist: r.artist, count: r._count.id }));
  }

  async getThemes(userId: string) {
    const rows = await this.prisma.songTag.groupBy({
      by: ['tag'],
      where: { savedLyric: { userId }, type: 'CONTEXT' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });
    return rows.map((r) => ({ tag: r.tag, count: r._count.id }));
  }

  async getMonthlyTimeline(userId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const songs = await this.prisma.savedLyric.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: {
        id: true,
        track: true,
        artist: true,
        artists: true,
        createdAt: true,
        tags: {
          where: { type: 'MOOD' },
          select: { tag: true },
        },
        searchHistory: { select: { imgUrl: true, spotifyId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month (0–11)
    const monthMap = new Map<number, typeof songs>();
    for (const song of songs) {
      const m = new Date(song.createdAt).getMonth();
      if (!monthMap.has(m)) monthMap.set(m, []);
      monthMap.get(m)!.push(song);
    }

    const MONTH_NAMES = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
    ];

    return [...monthMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([m, monthSongs]) => {
        const freq = new Map<string, number>();
        for (const song of monthSongs) {
          for (const { tag } of song.tags) {
            freq.set(tag, (freq.get(tag) ?? 0) + 1);
          }
        }
        const dominantMood =
          [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        return { month: MONTH_NAMES[m], year, dominantMood, songs: monthSongs };
      });
  }

  async getTimeline(userId: string) {
    // Last 52 weeks of saves, grouped by ISO week (YYYY-Www)
    const since = new Date();
    since.setDate(since.getDate() - 364);

    const saves = await this.prisma.savedLyric.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build a map of all 52 weeks (filled with 0 by default)
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
