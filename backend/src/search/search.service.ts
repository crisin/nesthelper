import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, q: string) {
    if (!q.trim()) return { songs: [], lyrics: [], tags: [] };

    const term = q.trim();

    // 1. Songs matched by track/artist name
    const songs = await this.prisma.savedLyric.findMany({
      where: {
        userId,
        OR: [
          { track: { contains: term, mode: 'insensitive' } },
          { artist: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: {
        searchHistory: { select: { imgUrl: true, spotifyId: true } },
        tags: true,
      },
      take: 20,
    });

    const songIds = new Set(songs.map((s) => s.id));

    // 2. Songs matched by lyrics content (excluding already found by name)
    const lyricMatches = await this.prisma.savedLyric.findMany({
      where: {
        userId,
        id: { notIn: [...songIds] },
        OR: [
          { lyrics: { contains: term, mode: 'insensitive' } },
          { lyricsStructured: { rawText: { contains: term, mode: 'insensitive' } } },
        ],
      },
      include: {
        searchHistory: { select: { imgUrl: true, spotifyId: true } },
        lyricsStructured: {
          select: {
            version: true,
            lines: {
              where: { text: { contains: term, mode: 'insensitive' } },
              orderBy: { lineNumber: 'asc' },
              take: 3,
            },
          },
        },
        tags: true,
      },
      take: 20,
    });

    const allFoundIds = new Set([...songIds, ...lyricMatches.map((s) => s.id)]);

    // 3. Songs matched by tag
    const tagMatches = await this.prisma.savedLyric.findMany({
      where: {
        userId,
        id: { notIn: [...allFoundIds] },
        tags: { some: { tag: { contains: term, mode: 'insensitive' } } },
      },
      include: {
        searchHistory: { select: { imgUrl: true, spotifyId: true } },
        tags: true,
      },
      take: 20,
    });

    return { songs, lyrics: lyricMatches, tags: tagMatches };
  }
}
