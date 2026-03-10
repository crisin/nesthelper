import { Injectable, NotFoundException } from '@nestjs/common';
import { SavedLyric, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BOOKMARK_INCLUDE = {
  song: {
    include: {
      lyrics: {
        include: {
          lines: { orderBy: { lineNumber: 'asc' as const } },
          versions: { orderBy: { version: 'desc' as const }, take: 20 },
        },
      },
      tags: { orderBy: { createdAt: 'asc' as const } },
    },
  },
} satisfies Prisma.SavedLyricInclude;

export type BookmarkWithSong = Prisma.SavedLyricGetPayload<{
  include: typeof BOOKMARK_INCLUDE;
}>;

@Injectable()
export class SavedLyricsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string): Promise<BookmarkWithSong[]> {
    return this.prisma.savedLyric.findMany({
      where: { userId },
      include: BOOKMARK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  getFavorites(userId: string): Promise<BookmarkWithSong[]> {
    return this.prisma.savedLyric.findMany({
      where: { userId, isFavorite: true },
      include: BOOKMARK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string): Promise<BookmarkWithSong> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      include: BOOKMARK_INCLUDE,
    });
    if (!item) throw new NotFoundException('SavedLyric not found');
    return item;
  }

  async ensureBySpotifyId(
    userId: string,
    spotifyId: string,
  ): Promise<BookmarkWithSong> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    return this.prisma.savedLyric.upsert({
      where: { userId_songId: { userId, songId: song.id } },
      create: { userId, songId: song.id },
      update: {},
      include: BOOKMARK_INCLUDE,
    });
  }

  async setFavorite(
    userId: string,
    spotifyId: string,
    isFavorite: boolean,
  ): Promise<Pick<SavedLyric, 'id' | 'isFavorite'>> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    return this.prisma.savedLyric.upsert({
      where: { userId_songId: { userId, songId: song.id } },
      create: { userId, songId: song.id, isFavorite },
      update: { isFavorite },
      select: { id: true, isFavorite: true },
    });
  }

  async upsertNote(
    userId: string,
    id: string,
    text: string,
  ): Promise<Pick<SavedLyric, 'id' | 'note'>> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('SavedLyric not found');

    return this.prisma.savedLyric.update({
      where: { id },
      data: { note: text || null },
      select: { id: true, note: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('SavedLyric not found');
    await this.prisma.savedLyric.delete({ where: { id } });
  }
}
