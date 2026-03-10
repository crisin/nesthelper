import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SearchHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';

type SearchHistoryWithUser = Prisma.SearchHistoryGetPayload<{
  include: { user: { select: { name: true } } };
}>;

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string): Promise<SearchHistory[]> {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getGlobal(): Promise<SearchHistoryWithUser[]> {
    return this.prisma.searchHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { name: true } },
      },
    });
  }

  async create(
    userId: string,
    dto: CreateSearchHistoryDto,
  ): Promise<SearchHistory> {
    const artists = dto.artists?.length
      ? dto.artists
      : dto.artist
        ? [dto.artist]
        : [];
    const artist = artists[0] ?? '';
    const { spotifyId } = dto;

    return this.prisma.$transaction(async (tx) => {
      const history = await tx.searchHistory.create({
        data: {
          userId,
          spotifyId,
          track: dto.track,
          artist,
          artists,
          url: dto.url,
          ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
        },
      });

      // Upsert shared Song record
      const song = await tx.song.upsert({
        where: { spotifyId },
        create: {
          spotifyId,
          title: dto.track,
          artist,
          artists,
          spotifyUrl: dto.url,
          imgUrl: dto.imgUrl ?? null,
        },
        update: {
          ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
        },
        select: { id: true },
      });

      // Auto-create a bookmark for this user (idempotent)
      await tx.savedLyric.upsert({
        where: { userId_songId: { userId, songId: song.id } },
        create: { userId, songId: song.id },
        update: {},
      });

      return history;
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.searchHistory.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Search history item not found');
    await this.prisma.searchHistory.delete({ where: { id } });
  }
}
