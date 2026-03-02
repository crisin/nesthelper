import { Injectable, NotFoundException } from '@nestjs/common';
import { SearchHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getGlobal() {
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

      await tx.libraryTrack.upsert({
        where: { spotifyId },
        update: {
          url: dto.url,
          ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
        },
        create: {
          spotifyId,
          name: dto.track,
          artist,
          artists,
          url: dto.url,
          imgUrl: dto.imgUrl,
        },
      });

      // Auto-create a SavedLyric for this track — this is the record the user can favorite
      await tx.savedLyric.upsert({
        where: { userId_spotifyId: { userId, spotifyId } },
        create: {
          userId,
          spotifyId,
          track: dto.track,
          artist,
          artists,
          lyrics: '',
          searchHistoryId: history.id,
        },
        update: {}, // never overwrite existing lyrics/notes/favorites
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
