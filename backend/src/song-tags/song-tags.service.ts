import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SongTag, TagType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddTagDto } from '../saved-lyrics/dto/add-tag.dto';

@Injectable()
export class SongTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTags(spotifyId: string): Promise<SongTag[]> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) return [];

    return this.prisma.songTag.findMany({
      where: { songId: song.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTag(
    userId: string,
    spotifyId: string,
    dto: AddTagDto,
  ): Promise<SongTag> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    const normalised = dto.tag.trim().toLowerCase();
    return this.prisma.songTag.upsert({
      where: { songId_tag: { songId: song.id, tag: normalised } },
      create: {
        songId: song.id,
        tag: normalised,
        type: dto.type ?? TagType.CONTEXT,
        addedBy: userId,
      },
      update: {},
    });
  }

  async removeTag(spotifyId: string, tag: string): Promise<void> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    await this.prisma.songTag.deleteMany({
      where: { songId: song.id, tag: tag.toLowerCase() },
    });
  }
}
