import { Injectable, NotFoundException } from '@nestjs/common';
import { Song, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SONG_INCLUDE = {
  lyrics: {
    include: {
      lines: { orderBy: { lineNumber: 'asc' as const } },
      versions: { orderBy: { version: 'desc' as const }, take: 20 },
    },
  },
  tags: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.SongInclude;

export type SongWithContent = Prisma.SongGetPayload<{
  include: typeof SONG_INCLUDE;
}>;

export type SongUpsertData = {
  spotifyId: string;
  title: string;
  artist: string;
  artists: string[];
  imgUrl?: string | null;
  spotifyUrl?: string | null;
};

@Injectable()
export class SongsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: SongUpsertData): Promise<Song> {
    return this.prisma.song.upsert({
      where: { spotifyId: data.spotifyId },
      create: {
        spotifyId: data.spotifyId,
        title: data.title,
        artist: data.artist,
        artists: data.artists,
        imgUrl: data.imgUrl,
        spotifyUrl: data.spotifyUrl,
      },
      update: {
        ...(data.imgUrl ? { imgUrl: data.imgUrl } : {}),
      },
    });
  }

  async getBySpotifyId(spotifyId: string): Promise<SongWithContent | null> {
    return this.prisma.song.findUnique({
      where: { spotifyId },
      include: SONG_INCLUDE,
    });
  }

  async getAll(): Promise<
    (Omit<Song, never> & { hasLyrics: boolean; saveCount: number })[]
  > {
    const songs = await this.prisma.song.findMany({
      include: {
        lyrics: { select: { id: true } },
        tags: { select: { id: true } },
        _count: { select: { savedBy: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return songs.map((s) => ({
      ...s,
      hasLyrics: !!s.lyrics,
      saveCount: s._count.savedBy,
      _count: undefined,
      lyrics: undefined,
      tags: undefined,
    }));
  }

  async updateVideoUrl(
    spotifyId: string,
    url: string,
  ): Promise<Pick<Song, 'spotifyId' | 'videoUrl'>> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    return this.prisma.song.update({
      where: { spotifyId },
      data: { videoUrl: url.trim() || null },
      select: { spotifyId: true, videoUrl: true },
    });
  }

  async getInsights(spotifyId: string): Promise<{
    saveCount: number;
    tagDistribution: { tag: string; count: number }[];
    mostAnnotatedLines: { text: string; lineNumber: number; count: number }[];
  }> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      include: {
        _count: { select: { savedBy: true } },
        tags: { select: { tag: true } },
        lyrics: {
          include: {
            lines: {
              select: {
                text: true,
                lineNumber: true,
                _count: { select: { annotations: true } },
              },
            },
          },
        },
      },
    });

    if (!song) return { saveCount: 0, tagDistribution: [], mostAnnotatedLines: [] };

    const tagMap = new Map<string, number>();
    for (const t of song.tags) {
      tagMap.set(t.tag, (tagMap.get(t.tag) ?? 0) + 1);
    }
    const tagDistribution = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const mostAnnotatedLines = (song.lyrics?.lines ?? [])
      .filter((l) => l._count.annotations > 0 && l.text.trim())
      .sort((a, b) => b._count.annotations - a._count.annotations)
      .slice(0, 5)
      .map((l) => ({ text: l.text, lineNumber: l.lineNumber, count: l._count.annotations }));

    return { saveCount: song._count.savedBy, tagDistribution, mostAnnotatedLines };
  }
}
