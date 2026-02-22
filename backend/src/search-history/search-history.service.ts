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

  create(userId: string, dto: CreateSearchHistoryDto) {
    return this.prisma.searchHistory.create({
      data: { userId, ...dto },
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
