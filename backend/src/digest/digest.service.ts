import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface DigestContent {
  savedCount: number;
  topWord: string | null;
  topArtist: string | null;
  communityInsight: string | null;
}

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
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLatest(userId: string) {
    return this.prisma.digest.findFirst({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.digest.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  // ─── Cron: Monday 08:00 ───────────────────────────────────────────────────

  @Cron('0 8 * * 1')
  async generateWeeklyDigests() {
    this.logger.log('Generating weekly digests…');
    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setHours(0, 0, 0, 0);

    const weekStart = new Date(since);

    // Find all users who saved at least one song this week
    const activeUsers = await this.prisma.savedLyric.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
    });

    const communityInsight = await this.getCommunityInsight(since);

    for (const { userId } of activeUsers) {
      try {
        await this.generateForUser(userId, since, weekStart, communityInsight);
      } catch (err) {
        this.logger.error(`Digest generation failed for user ${userId}`, err);
      }
    }
    this.logger.log(`Digests generated for ${activeUsers.length} users.`);
  }

  private async generateForUser(
    userId: string,
    since: Date,
    weekStart: Date,
    communityInsight: string | null,
  ) {
    const weekSaves = await this.prisma.savedLyric.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { artist: true },
    });
    const savedCount = weekSaves.length;

    // Top artist this week
    const artistFreq = new Map<string, number>();
    for (const { artist } of weekSaves) {
      artistFreq.set(artist, (artistFreq.get(artist) ?? 0) + 1);
    }
    const topArtist =
      [...artistFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Top word from lyrics of songs saved this week
    const lyrics = await this.prisma.lyrics.findMany({
      where: { savedLyric: { userId, createdAt: { gte: since } } },
      select: { rawText: true },
    });
    const wordFreq = new Map<string, number>();
    for (const { rawText } of lyrics) {
      const words = rawText
        .toLowerCase()
        .replace(/[^a-z0-9'\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }
    const topWord =
      [...wordFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const content: DigestContent = {
      savedCount,
      topWord,
      topArtist,
      communityInsight,
    };

    await this.prisma.digest.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, content: content as Prisma.InputJsonValue },
      update: { content: content as Prisma.InputJsonValue, read: false },
    });
  }

  private async getCommunityInsight(since: Date): Promise<string | null> {
    // Find lines from PUBLIC songs that have annotations this week, sorted by annotation count
    const candidates = await this.prisma.lyricsLine.findMany({
      where: {
        lyrics: { savedLyric: { visibility: 'PUBLIC' } },
        annotations: { some: { createdAt: { gte: since } } },
      },
      select: {
        text: true,
        annotations: {
          where: { createdAt: { gte: since } },
          select: { id: true },
        },
      },
      take: 20,
    });

    return (
      candidates.sort((a, b) => b.annotations.length - a.annotations.length)[0]
        ?.text ?? null
    );
  }
}
