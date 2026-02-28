import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TagType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
import { LYRICS_FETCH_QUEUE } from '../lyrics-fetch/lyrics-fetch.queue';

@Injectable()
export class SavedLyricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @InjectQueue(LYRICS_FETCH_QUEUE) private readonly lyricsQueue: Queue | null,
  ) {}

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

  async create(userId: string, dto: CreateSavedLyricDto) {
    const artists = dto.artists?.length ? dto.artists : (dto.artist ? [dto.artist] : []);
    const artist = artists[0] ?? '';
    const hasLyrics = !!(dto.lyrics?.trim());

    const saved = await this.prisma.savedLyric.create({
      data: {
        userId,
        track: dto.track,
        artist,
        artists,
        lyrics: dto.lyrics ?? '',
        fetchStatus: hasLyrics ? 'DONE' : (this.lyricsQueue ? 'FETCHING' : 'IDLE'),
        ...(dto.searchHistoryId ? { searchHistoryId: dto.searchHistoryId } : {}),
      },
      include: {
        searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
        tags: true,
      },
    });

    // Capture listening context (hour + day of week)
    const now = new Date();
    await this.prisma.listeningContext.create({
      data: {
        savedLyricId: saved.id,
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
      },
    }).catch(() => { /* non-critical, ignore errors */ });

    // Enqueue lyrics fetch if no lyrics provided and queue is available
    if (!hasLyrics && this.lyricsQueue) {
      await this.lyricsQueue.add('fetch', {
        savedLyricId: saved.id,
        track: dto.track,
        artist, // primary artist for lyrics.ovh
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    return saved;
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
      create: { savedLyricId: id, tag: normalised, type: dto.type ?? TagType.CONTEXT },
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

  // ─── Visibility ───────────────────────────────────────────────────────────

  async updateVisibility(userId: string, id: string, visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC') {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Saved lyric not found');
    return this.prisma.savedLyric.update({
      where: { id },
      data: { visibility },
      select: { id: true, visibility: true },
    });
  }
}
