import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';

@Injectable()
export class SavedLyricsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.savedLyric.findMany({
      where: { userId },
      include: {
        searchHistory: { select: { imgUrl: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateSavedLyricDto) {
    return this.prisma.savedLyric.create({
      data: {
        userId,
        track: dto.track,
        artist: dto.artist,
        lyrics: dto.lyrics ?? '',
        ...(dto.searchHistoryId ? { searchHistoryId: dto.searchHistoryId } : {}),
      },
    });
  }

  async updateLyrics(userId: string, id: string, dto: UpdateSavedLyricDto) {
    const item = await this.prisma.savedLyric.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Saved lyric not found');
    return this.prisma.savedLyric.update({
      where: { id },
      data: { lyrics: dto.lyrics },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.savedLyric.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Saved lyric not found');
    await this.prisma.savedLyric.delete({ where: { id } });
  }
}
