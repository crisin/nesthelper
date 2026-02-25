import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';

@Injectable()
export class SavedLyricsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.savedLyric.findMany({
      where: { userId },
      include: {
        searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
        tags: { orderBy: { createdAt: 'asc' } },
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
      include: {
        searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
        tags: true,
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

  // ─── Note ────────────────────────────────────────────────────────────────

  async upsertNote(userId: string, id: string, text: string) {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');
    return this.prisma.savedLyric.update({
      where: { id },
      data: { note: text },
      select: { id: true, note: true },
    });
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────

  async addTag(userId: string, id: string, dto: AddTagDto) {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');

    const normalised = dto.tag.trim().toLowerCase();
    return this.prisma.songTag.upsert({
      where: { savedLyricId_tag: { savedLyricId: id, tag: normalised } },
      create: { savedLyricId: id, tag: normalised, type: (dto.type as any) ?? 'CONTEXT' },
      update: {},
    });
  }

  async removeTag(userId: string, id: string, tag: string) {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');
    await this.prisma.songTag.deleteMany({
      where: { savedLyricId: id, tag: tag.toLowerCase() },
    });
  }

  async getTags(userId: string, id: string) {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');
    return this.prisma.songTag.findMany({
      where: { savedLyricId: id },
      orderBy: { createdAt: 'asc' },
    });
  }
}
