import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const tracks = await this.prisma.libraryTrack.findMany({
      orderBy: { lastSeenAt: 'desc' },
    });

    if (tracks.length === 0) return [];

    // Count non-empty lyrics per spotifyId (joined through searchHistory)
    const lyricRows = await this.prisma.savedLyric.findMany({
      where: {
        lyrics: { not: '' },
        searchHistory: { spotifyId: { in: tracks.map((t) => t.spotifyId) } },
      },
      select: { searchHistory: { select: { spotifyId: true } } },
    });

    const countMap = new Map<string, number>();
    for (const l of lyricRows) {
      const sid = l.searchHistory?.spotifyId;
      if (sid) countMap.set(sid, (countMap.get(sid) ?? 0) + 1);
    }

    // Count total searches per spotifyId
    const searchRows = await this.prisma.searchHistory.groupBy({
      by: ['spotifyId'],
      where: { spotifyId: { in: tracks.map((t) => t.spotifyId) } },
      _count: { id: true },
    });
    const searchMap = new Map<string, number>();
    for (const r of searchRows) {
      searchMap.set(r.spotifyId, r._count.id);
    }

    return tracks.map((t) => ({
      ...t,
      lyricsCount: countMap.get(t.spotifyId) ?? 0,
      searchCount: searchMap.get(t.spotifyId) ?? 0,
    }));
  }

  async getLyrics(id: string) {
    const track = await this.prisma.libraryTrack.findUnique({ where: { id } });
    if (!track) throw new NotFoundException('Track not found');

    const lyrics = await this.prisma.savedLyric.findMany({
      where: {
        lyrics: { not: '' },
        searchHistory: { spotifyId: track.spotifyId },
      },
      select: {
        id: true,
        lyrics: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { track, lyrics };
  }
}
