import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(userId: string, dto: CreateSearchHistoryDto) {
    const artists = dto.artists?.length ? dto.artists : (dto.artist ? [dto.artist] : []);
    const artist = artists[0] ?? '';

    const [history] = await this.prisma.$transaction([
      this.prisma.searchHistory.create({
        data: {
          userId,
          spotifyId: dto.spotifyId,
          track: dto.track,
          artist,
          artists,
          url: dto.url,
          ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
        },
      }),
      this.prisma.libraryTrack.upsert({
        where: { spotifyId: dto.spotifyId },
        update: {
          url: dto.url,
          ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
        },
        create: {
          spotifyId: dto.spotifyId,
          name: dto.track,
          artist,
          artists,
          url: dto.url,
          imgUrl: dto.imgUrl,
        },
      }),
    ]);
    return history;
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.searchHistory.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Search history item not found');
    await this.prisma.searchHistory.delete({ where: { id } });
  }
}
