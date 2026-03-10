import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const NOTE_INCLUDE = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.SongNoteInclude;

export type SongNoteWithUser = Prisma.SongNoteGetPayload<{
  include: typeof NOTE_INCLUDE;
}>;

@Injectable()
export class SongNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForSong(spotifyId: string): Promise<SongNoteWithUser[]> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) return [];

    return this.prisma.songNote.findMany({
      where: { songId: song.id },
      include: NOTE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsert(
    userId: string,
    spotifyId: string,
    text: string,
  ): Promise<SongNoteWithUser> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    return this.prisma.songNote.upsert({
      where: { userId_songId: { userId, songId: song.id } },
      create: { songId: song.id, userId, text },
      update: { text },
      include: NOTE_INCLUDE,
    });
  }

  async remove(userId: string, spotifyId: string): Promise<void> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) return;
    await this.prisma.songNote.deleteMany({ where: { userId, songId: song.id } });
  }
}
