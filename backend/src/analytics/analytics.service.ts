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
